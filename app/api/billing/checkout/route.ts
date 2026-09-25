import { NextResponse } from "next/server";
import { requireUserFromRequest, serviceRest } from "@/lib/server-user";
import { stripeForm } from "@/lib/stripe-rest";

export const runtime="nodejs";

export async function POST(req:Request){
  try{
    const user=await requireUserFromRequest(req);
    const {plan="pro"}=await req.json().catch(()=>({plan:"pro"}));
    if(!["pro","team"].includes(plan)) return NextResponse.json({error:"Invalid plan"},{status:400});
    const price=plan==="team"?process.env.STRIPE_PRICE_TEAM:process.env.STRIPE_PRICE_PRO;
    if(!price) return NextResponse.json({error:`Stripe price for ${plan} is not configured`},{status:503});
    const profiles=await serviceRest<any[]>(`profiles?id=eq.${user.id}&select=stripe_customer_id,email`);
    const profile=profiles[0];
    const site=process.env.SITE_URL||new URL(req.url).origin;
    const p=new URLSearchParams();
    p.set("mode","subscription");
    p.set("line_items[0][price]",price);
    p.set("line_items[0][quantity]","1");
    p.set("success_url",`${site}/account?checkout=success`);
    p.set("cancel_url",`${site}/subscribe?checkout=cancelled`);
    p.set("client_reference_id",user.id);
    p.set("metadata[user_id]",user.id);
    p.set("metadata[plan]",plan);
    p.set("subscription_data[metadata][user_id]",user.id);
    p.set("subscription_data[metadata][plan]",plan);
    p.set("allow_promotion_codes","true");
    if(profile?.stripe_customer_id) p.set("customer",profile.stripe_customer_id);
    else if(user.email||profile?.email) p.set("customer_email",user.email||profile.email);
    const session=await stripeForm<any>("/checkout/sessions",p);
    return NextResponse.json({url:session.url});
  }catch(error:any){
    const status=error?.message==="UNAUTHORIZED"?401:500;
    return NextResponse.json({error:error?.message||"Checkout failed"},{status});
  }
}
