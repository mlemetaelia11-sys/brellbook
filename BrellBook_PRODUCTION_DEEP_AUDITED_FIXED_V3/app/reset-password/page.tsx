'use client';
import { Suspense } from "react";
import {useState} from 'react';
import {useSearchParams,useRouter} from 'next/navigation';
function ResetPasswordContent(){const q=useSearchParams(),r=useRouter(),[pw,setPw]=useState(''),[msg,setMsg]=useState('');async function save(){const x=await fetch('/api/password-reset',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({token:q.get('token'),password:pw})});const d=await x.json();setMsg(x.ok?'Password updated. You can sign in now.':d.error||'Could not update password.');if(x.ok)setTimeout(()=>r.push('/login'),1200)}return <main className="auth"><div className="auth-card card"><div className="eyebrow">BrellBook Security</div><h1>Set a new password</h1><div className="field"><label>New password</label><input type="password" minLength={8} value={pw} onChange={e=>setPw(e.target.value)}/></div><button className="btn btn-primary" onClick={save} disabled={pw.length<8}>Update password</button>{msg&&<p className="muted">{msg}</p>}</div></main>}
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}