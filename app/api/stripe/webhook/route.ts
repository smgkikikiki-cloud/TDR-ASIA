import { NextResponse } from "next/server";
import { serviceRest } from "@/lib/server-user";
import { stripeGet, verifyStripeSignature } from "@/lib/stripe-rest";

export const runtime="nodejs";

type StripeEvent={id:string;type:string;data:{object:any}};

async function findUserByCustomer(customer:string){
  const rows=await serviceRest<any[]>(`profiles?stripe_customer_id=eq.${encodeURIComponent(customer)}&select=id`);
  return rows[0]?.id as string|undefined;
}

async function syncSubscription(sub:any, fallbackUserId?:string){
  const customer=typeof sub.customer==="string"?sub.customer:sub.customer?.id;
  const price=sub.items?.data?.[0]?.price;
  const metadata=sub.metadata||{};
  const userId=metadata.user_id||fallbackUserId||(customer?await findUserByCustomer(customer):undefined);
  if(!userId) throw new Error("NO_USER_FOR_SUBSCRIPTION");
  const plan=metadata.plan || (price?.id===process.env.STRIPE_PRICE_TEAM?"team":"pro");
  const status=String(sub.status||"unknown");
  await serviceRest("subscriptions?on_conflict=stripe_subscription_id",{
    method:"POST",
    headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify({
      stripe_subscription_id:sub.id,user_id:userId,stripe_customer_id:customer,
      stripe_price_id:price?.id||null,stripe_product_id:typeof price?.product==="string"?price.product:price?.product?.id||null,
      plan,status,current_period_end:sub.current_period_end?new Date(sub.current_period_end*1000).toISOString():null,
      cancel_at_period_end:Boolean(sub.cancel_at_period_end)
    })
  });
  const effective=["active","trialing"].includes(status)?plan:"free";
  await serviceRest(`profiles?id=eq.${userId}`,{
    method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({stripe_customer_id:customer||null,plan:effective})
  });
}

async function markFreeByCustomer(customer:string){
  const userId=await findUserByCustomer(customer); if(!userId)return;
  await serviceRest(`profiles?id=eq.${userId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({plan:"free"})});
}

export async function POST(req:Request){
  const raw=await req.text();
  if(!verifyStripeSignature(raw,req.headers.get("stripe-signature"))) return NextResponse.json({error:"Invalid signature"},{status:400});
  const event=JSON.parse(raw) as StripeEvent;
  const seen=await serviceRest<any[]>(`stripe_events?event_id=eq.${encodeURIComponent(event.id)}&select=event_id`);
  if(seen.length) return NextResponse.json({received:true,duplicate:true});
  try{
    const object=event.data.object;
    if(event.type==="checkout.session.completed" && object.mode==="subscription" && object.subscription){
      const customer=typeof object.customer==="string"?object.customer:object.customer?.id;
      const userId=object.client_reference_id||object.metadata?.user_id;
      if(customer&&userId) await serviceRest(`profiles?id=eq.${userId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({stripe_customer_id:customer})});
      const sub=await stripeGet<any>(`/subscriptions/${object.subscription}`);
      await syncSubscription(sub,userId);
    }
    if(["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event.type)) await syncSubscription(object);
    if(event.type==="invoice.payment_failed"){
      const customer=typeof object.customer==="string"?object.customer:object.customer?.id;
      if(customer) await markFreeByCustomer(customer);
    }
    await serviceRest("stripe_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({event_id:event.id,event_type:event.type})});
    return NextResponse.json({received:true});
  }catch(error:any){
    return NextResponse.json({error:error?.message||"Webhook processing failed"},{status:500});
  }
}
