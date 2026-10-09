export async function sendEmail(input:{to:string;subject:string;html:string;text?:string}){
 const key=process.env.RESEND_API_KEY, from=process.env.RESEND_FROM_EMAIL||process.env.EMAIL_FROM;
 if(!key||!from) { if(process.env.NODE_ENV==='production') throw new Error('EMAIL_NOT_CONFIGURED'); return {id:'dev-no-send'}; }
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:input.to,subject:input.subject,html:input.html,text:input.text}),signal:AbortSignal.timeout(15000)});
 const d=await r.json(); if(!r.ok) throw new Error('EMAIL_SEND_FAILED'); return d;
}
export function emailLayout(title:string,body:string){return `<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;padding:32px;color:#1B1B3A"><h2>${title}</h2>${body}<p style="color:#64748B;margin-top:32px">BrellBook — Book it. Don't miss it.</p></div>`}
