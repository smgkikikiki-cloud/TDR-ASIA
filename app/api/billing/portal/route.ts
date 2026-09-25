import { NextResponse } from "next/server";
import { requireUserFromRequest, serviceRest } from "@/lib/server-user";
import { stripeForm } from "@/lib/stripe-rest";

export const runtime="nodejs";

export async function POST(req:Request){
  try{
    const user=await requireUserFromRequest(req);
    const rows=await serviceRest<any[]>(`profiles?id=eq.${user.id}&select=stripe_customer_id`);
    const customer=rows[0]?.stripe_customer_id;
    if(!customer) return NextResponse.json({error:"No Stripe customer exists for this account"},{status:400});
    const site=process.env.SITE_URL||new URL(req.url).origin;
    const p=new URLSearchParams({customer,return_url:`${site}/account`});
    const session=await stripeForm<any>("/billing_portal/sessions",p);
    return NextResponse.json({url:session.url});
  }catch(error:any){
    return NextResponse.json({error:error?.message||"Portal failed"},{status:error?.message==="UNAUTHORIZED"?401:500});
  }
}
