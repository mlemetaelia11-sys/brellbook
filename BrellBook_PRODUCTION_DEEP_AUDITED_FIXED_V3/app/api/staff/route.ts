import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/prisma';
import {requireMembership} from '@/lib/tenant';
import {requirePlan} from '@/lib/subscription';

const schema=z.object({businessId:z.string(),name:z.string().min(2).max(100),phone:z.string().max(30).optional(),email:z.string().email().optional().or(z.literal('')),active:z.boolean().optional(),serviceIds:z.array(z.string()).optional()});

async function validServiceIds(businessId:string, serviceIds:string[]) {
  const rows=await db.service.findMany({where:{businessId,id:{in:serviceIds}},select:{id:true}});
  return rows.length===new Set(serviceIds).size;
}

export async function GET(req:Request){const businessId=new URL(req.url).searchParams.get('businessId');if(!businessId)return NextResponse.json({error:'businessId required'},{status:400});const {membership}=await requireMembership(businessId);if(!membership)return NextResponse.json({error:'Forbidden'},{status:403});return NextResponse.json({staff:await db.staff.findMany({where:{businessId},include:{services:{include:{service:true}},hours:true,_count:{select:{bookings:true}}},orderBy:{name:'asc'}})});}

export async function POST(req:Request){const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:'Invalid staff.'},{status:400});const {membership}=await requireMembership(p.data.businessId);if(!membership||membership.role==='STAFF')return NextResponse.json({error:'Forbidden'},{status:403});const entitlement=await requirePlan(p.data.businessId,'PRO');if(!entitlement.allowed)return NextResponse.json({error:'Pro plan required for staff management.'},{status:403});const {serviceIds=[],...data}=p.data;if(!(await validServiceIds(p.data.businessId,serviceIds)))return NextResponse.json({error:'One or more selected services do not belong to this business.'},{status:400});const staff=await db.staff.create({data:{...data,businessId:p.data.businessId,email:data.email||null,services:{create:serviceIds.map(serviceId=>({serviceId}))}}});return NextResponse.json({staff},{status:201});}

export async function PATCH(req:Request){const id=new URL(req.url).searchParams.get('id');const p=schema.partial().safeParse(await req.json());if(!id||!p.success||!p.data.businessId)return NextResponse.json({error:'Invalid request'},{status:400});const {membership}=await requireMembership(p.data.businessId);if(!membership||membership.role==='STAFF')return NextResponse.json({error:'Forbidden'},{status:403});const entitlement=await requirePlan(p.data.businessId,'PRO');if(!entitlement.allowed)return NextResponse.json({error:'Pro plan required for staff management.'},{status:403});const {serviceIds,...data}=p.data;const existing=await db.staff.findFirst({where:{id,businessId:p.data.businessId}});if(!existing)return NextResponse.json({error:'Staff member not found.'},{status:404});if(serviceIds && !(await validServiceIds(p.data.businessId,serviceIds)))return NextResponse.json({error:'One or more selected services do not belong to this business.'},{status:400});const staff=await db.$transaction(async tx=>{const updated=await tx.staff.update({where:{id},data:{...data,email:data.email===undefined?undefined:data.email||null}});if(serviceIds){await tx.staffService.deleteMany({where:{staffId:id}});if(serviceIds.length)await tx.staffService.createMany({data:serviceIds.map(serviceId=>({staffId:id,serviceId})),skipDuplicates:true});}return tx.staff.findUnique({where:{id:updated.id},include:{services:{include:{service:true}},hours:true}});});return NextResponse.json({staff});}
