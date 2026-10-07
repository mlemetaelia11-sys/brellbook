import Link from 'next/link';
import { db } from '@/lib/prisma';
import { effectivePlan } from '@/lib/subscription';

export default async function BusinessPage({params}:{params:Promise<{businessSlug:string}>}){
 const {businessSlug}=await params;
 const b=await db.business.findUnique({where:{slug:businessSlug},include:{services:{where:{active:true},orderBy:{name:'asc'}},reviews:{where:{approved:true},include:{customer:true},take:8,orderBy:{createdAt:'desc'}},workingHours:{orderBy:{dayOfWeek:'asc'}},subscription:true}});
 if(!b)return <main className="container section"><div className="card panel"><h1>Business not found</h1><p className="muted">This booking page may have been moved or is no longer active.</p></div></main>;
 const effective=effectivePlan(b.subscription);
 const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 const wa=b.whatsappNumber?.replace(/\D/g,'');
 const heroStyle=b.coverUrl?{backgroundImage:`linear-gradient(90deg,rgba(12,12,30,.92) 0%,rgba(12,12,30,.72) 48%,rgba(12,12,30,.35) 100%),url(${b.coverUrl})`}:{backgroundImage:'radial-gradient(circle at 80% 20%,rgba(108,43,255,.55),transparent 35%),linear-gradient(135deg,#171733 0%,#342080 48%,#6c2bff 100%)'};
 return <main className="public-business">
  <section className="public-hero" style={heroStyle}>
   <div className="container public-hero-inner">
    <div className="public-topline">{effective==='FREE'?<span className="public-brand">BrellBook</span>:<span className="public-brand">Online booking</span>}<span className="public-live">● Online booking</span></div>
    <div className="public-identity">
      <div className="public-logo-wrap">{b.logoUrl?<img src={b.logoUrl} alt={`${b.name} logo`} className="public-logo-img"/>:<div className="public-logo-fallback">{b.name.slice(0,1).toUpperCase()}</div>}</div>
      <div><div className="public-eyebrow">{b.type||'Professional service'}</div><h1>{b.name}</h1><p>{b.description||'Book your appointment online in a few simple steps.'}</p></div>
    </div>
    <div className="public-contact-row">
      {b.phone&&<a href={`tel:${b.phone}`} className="public-chip">☎ <span>{b.phone}</span></a>}
      {b.location&&<span className="public-chip">⌖ <span>{b.location}</span></span>}
      {b.address&&<span className="public-chip">⌂ <span>{b.address}</span></span>}
    </div>
    <div className="public-actions"><Link href={`/${b.slug}/book`} className="btn btn-primary public-book-btn">Book an appointment <span>→</span></Link>{wa&&<a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Habari ${b.name}, ningependa kupata huduma.`)}`} className="btn public-whatsapp">Chat on WhatsApp</a>}</div>
   </div>
  </section>
  <section className="public-content"><div className="container">
   <div className="public-section-head"><div><span className="eyebrow">Our services</span><h2>Choose a service</h2><p className="muted">Pick what you need and we’ll show you the available times.</p></div><Link href={`/${b.slug}/book`} className="btn btn-secondary">View all availability</Link></div>
   <div className="public-services">{b.services.map(s=><article className="public-service-card" key={s.id}><div className="public-service-image" style={s.imageUrl?{backgroundImage:`linear-gradient(180deg,transparent 20%,rgba(20,20,45,.72)),url(${s.imageUrl})`}:undefined}><span>{s.category||'Service'}</span></div><div className="public-service-body"><div><h3>{s.name}</h3><p>{s.description||'No description provided by this business.'}</p></div><div className="public-service-meta"><strong>TSh {Number(s.price).toLocaleString()}</strong><span>{s.durationMin} min</span></div><Link href={`/${b.slug}/book?service=${s.id}`} className="btn btn-primary public-service-btn">Book {s.name} <span>→</span></Link></div></article>)}</div>
   {!b.services.length&&<div className="empty">No services are available yet.</div>}
   <div className="public-two-col">
    <div className="public-panel"><div className="eyebrow">Plan your visit</div><h2>Opening hours</h2>{b.workingHours.map(h=><div className="public-hours" key={h.dayOfWeek}><strong>{days[h.dayOfWeek]}</strong><span>{h.isClosed||!h.openTime||!h.closeTime?'Closed':`${h.openTime} – ${h.closeTime}`}</span></div>)}</div>
    <div className="public-panel"><div className="eyebrow">What clients say</div><h2>Reviews</h2>{b.reviews.slice(0,4).map(r=><div className="public-review" key={r.id}><div className="stars">{'★'.repeat(r.rating)}<span>{'★'.repeat(5-r.rating)}</span></div><p>{r.comment||'No written comment.'}</p><small>{r.customer.name}</small></div>)}{!b.reviews.length&&<p className="muted">Reviews from completed appointments will appear here.</p>}</div>
   </div>
   <div className="public-final-cta"><div><span className="eyebrow">Ready when you are</span><h2>Book your next appointment.</h2><p>Choose a service, pick a convenient time and you’re done.</p></div><Link href={`/${b.slug}/book`} className="btn btn-primary">Book now →</Link></div>
   <footer className="public-footer">{effective==='FREE'?<span>Powered by <strong>BrellBook</strong></span>:<span>Book it. Don&apos;t miss it.</span>}<span>{effective==='FREE'?'Book it. Don&apos;t miss it.':'Online booking'}</span></footer>
  </div></section>
 </main>
}
