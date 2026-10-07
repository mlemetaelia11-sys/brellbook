'use client';
import {useEffect,useRef,useState} from 'react';import {DashboardShell} from '@/components/DashboardShell';
export default function Profile(){const [u,setU]=useState<any>(null),[msg,setMsg]=useState(''),[uploading,setUploading]=useState(false);const fileRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{fetch('/api/profile').then(x=>x.json()).then(d=>setU(d.user))},[]);
 async function upload(file:File){if(!u)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setMsg('Use JPG, PNG or WebP up to 5MB.');return}setUploading(true);setMsg('Uploading photo…');const q=await fetch('/api/uploads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({businessId:'profile',folder:'profiles',contentType:file.type,size:file.size})});const d=await q.json();if(!q.ok){setMsg(d.error||'Upload unavailable.');setUploading(false);return}const put=await fetch(d.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!put.ok){setMsg('Photo upload failed.');setUploading(false);return}const saved = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...u, imageKey: d.publicUrl || d.key }),
    });
    const savedData = await saved.json();
    if (!saved.ok) {
      setMsg(savedData.error || 'Photo uploaded but could not be saved.');
    } else {
      setU(savedData.user);
      setMsg('Profile photo updated successfully.');
    }
    setUploading(false)}
 if(!u)return <DashboardShell title="My Profile"><div className="card panel">Loading profile…</div></DashboardShell>;
 return <DashboardShell title="My Profile"><div className="page-title"><div><h1>My Profile</h1><p className="muted">Manage the account details your team sees.</p></div></div><div className="card panel" style={{maxWidth:760}}><div className="profile-hero"><div className="profile-photo">{u.imageKey?<img src={u.imageKey.startsWith('http')?u.imageKey:`/api/uploads?key=${encodeURIComponent(u.imageKey)}`} alt="Profile"/>:<span>{(u.name||'U').slice(0,1).toUpperCase()}</span>}</div><div><h3 style={{margin:'0 0 5px'}}>{u.name}</h3><p className="muted" style={{margin:0}}>{u.email}</p><button type="button" className="btn btn-secondary" style={{marginTop:12}} onClick={()=>fileRef.current?.click()} disabled={uploading}>{uploading?'Uploading…':'Upload profile photo'}</button><input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/></div></div><form onSubmit={async e=>{e.preventDefault();const r=await fetch('/api/profile',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(u)});const d=await r.json();if(r.ok){setU(d.user);setMsg('Profile updated successfully.')}else setMsg(d.error||'Update failed')}}><div className="field"><label>Full name</label><input value={u.name||''} onChange={e=>setU({...u,name:e.target.value})}/></div><div className="field"><label>Email</label><input value={u.email||''} disabled/></div><div className="field"><label>Phone</label><input value={u.phone||''} onChange={e=>setU({...u,phone:e.target.value})}/></div>{msg&&<p className="muted">{msg}</p>}<button className="btn btn-primary">Save changes</button></form></div></DashboardShell>}
