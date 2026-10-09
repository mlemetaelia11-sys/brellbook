export function StatusPill({status}:{status:string}){const key=status.toLowerCase().replace('_','-');return <span className={`status status-${key}`}>{status.replace('_',' ')}</span>}
