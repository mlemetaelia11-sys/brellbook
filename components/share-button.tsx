"use client";
export function ShareButton({title}:{title:string}){return <button className="btn btn-secondary" onClick={async()=>{try{if(navigator.share) await navigator.share({title,url:location.href}); else await navigator.clipboard.writeText(location.href);}catch{}}}>Share</button>}
