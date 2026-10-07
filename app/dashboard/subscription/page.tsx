'use client';
import {useEffect,useState} from 'react';
import {DashboardShell} from '@/components/DashboardShell';
const plans:any[]=[['FREE',0,'20 bookings / month','3 active services'],['STARTER',15000,'Unlimited bookings','Analytics + business customization'],['PRO',30000,'Staff management','Advanced analytics + reports']];
export default function Subscription(){
 const [b,setB]=useState<any>(null),[loading,setLoading]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{fetch('/api/me/business').then(r=>r.json()).then(x=>setB(x.business))},[]);
 async function pay(plan:string){setLoading(plan);setMessage('');const r=await fetch('/api/subscription/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({businessId:b.id,plan})});const d=await r.json();setLoading('');if(!r.ok){setMessage(d.error||'Payment could not start.');return}location.href=d.redirectUrl}
 const sub=b?.subscription, effective=b?.effectivePlan||'FREE';
 const end=sub?.currentPeriodEnd?new Date(sub.currentPeriodEnd):null; const grace=sub?.graceEndsAt?new Date(sub.graceEndsAt):null;
 return <DashboardShell title="Subscription"><div className="page-title"><div><h1>Subscription</h1><p className="muted">Your plan controls access to BrellBook premium features.</p></div></div>
 {b&&<div className="card panel" style={{marginBottom:16}}><div className="grid3"><div><span className="muted">Effective plan</span><h2 style={{margin:'6px 0'}}>{effective}</h2></div><div><span className="muted">Billing status</span><h3 style={{margin:'6px 0'}}>{sub?.status||'FREE'}</h3></div><div><span className="muted">Next billing date</span><h3 style={{margin:'6px 0'}}>{end?end.toLocaleDateString(): '—'}</h3></div></div>{sub?.status==='GRACE_PERIOD'&&grace&&<p className="warning" style={{marginBottom:0}}>Grace period ends {grace.toLocaleDateString()}. Premium access remains available until then; renew before the grace period ends to avoid downgrade to Free.</p>}{sub?.status==='EXPIRED'&&<p className="muted" style={{marginBottom:0}}>Your previous premium plan expired. Your effective plan is now Free. Your data is preserved.</p>}</div>}
 {b&&<div className="grid3">{plans.map(([plan,price,a,c])=><div className="card feature" key={plan}><span className="pill">{effective===plan?'Current access':plan}</span><h2>{plan}</h2><h3>TSh {Number(price).toLocaleString()} / month</h3><p className="muted">{a}</p><p className="muted">{c}</p>{plan!=='FREE'&&effective!==plan&&<button className="btn btn-primary" disabled={!!loading} onClick={()=>pay(plan)}>{loading===plan?'Opening Pesapal…':`Choose ${plan}`}</button>}</div>)}</div>}
 {message&&<div className="card feature"><p className="error">{message}</p></div>}
 <div className="card panel" style={{marginTop:16}}><h3>Billing safety</h3><p className="muted">A payment stays pending until Pesapal is verified server-side. Only a verified completed payment activates or extends the subscription. When a paid period ends, BrellBook automatically starts a 3-day grace period if a pending renewal exists; otherwise it downgrades the effective plan to Free without deleting business data.</p></div>
 </DashboardShell>
}
