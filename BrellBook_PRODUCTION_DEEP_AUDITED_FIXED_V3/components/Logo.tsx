export function Logo({ dark=false }: { dark?: boolean }) {
  return <div className="logo" style={{color: dark ? "#fff" : "#1B1B3A"}}>
    <span className="logo-mark">B</span><span>BrellBook</span>
  </div>;
}
