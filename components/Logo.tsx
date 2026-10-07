import Image from 'next/image';
export function Logo({dark=false}:{dark?:boolean}){return <div className="logo" style={{color:dark?'#fff':'#1B1B3A'}}><Image src="/brellbook-icon.png" alt="BrellBook" width={34} height={34} className="logo-image" priority/><span>BrellBook</span></div>}
