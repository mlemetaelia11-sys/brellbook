import { NextResponse } from 'next/server';
import { sync } from '@/app/api/pesapal/callback/sync';
export async function GET(req:Request){const u=new URL(req.url),tracking=u.searchParams.get('OrderTrackingId')||'',ref=u.searchParams.get('OrderMerchantReference')||'';if(tracking&&ref){await sync(tracking,ref);return NextResponse.json({orderNotificationType:'IPNCHANGE',orderTrackingId:tracking,orderMerchantReference:ref,status:200})}return NextResponse.json({status:500},{status:400})}
export const POST=GET;
