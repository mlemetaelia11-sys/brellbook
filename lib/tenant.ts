import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
export async function requireMembership(businessId:string){
 const s=await auth(); if(!s?.user?.id) return {session:null,membership:null};
 const membership=await db.businessMembership.findUnique({where:{businessId_userId:{businessId,userId:s.user.id}}});
 return {session:s,membership};
}
export async function currentMembership(){
 const s=await auth(); if(!s?.user?.id) return null;
 return db.businessMembership.findFirst({where:{userId:s.user.id},include:{business:true}});
}
