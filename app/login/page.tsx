import Link from "next/link";
import { Logo } from "@/components/Logo";
import LoginForm from "./LoginForm";
export default function Login(){return <main className="auth"><div className="auth-card card"><Logo/><h1>Welcome back</h1><p className="muted">Sign in to manage your business.</p><LoginForm/><p className="muted" style={{fontSize:13,marginTop:18}}><Link href="/forgot-password" style={{color:"#6C2BFF",fontWeight:700}}>Forgot your password?</Link> Email verification is sent after signup.</p><p style={{fontSize:13}}>New to BrellBook? <Link href="/signup" style={{color:"#6C2BFF",fontWeight:700}}>Create account</Link></p></div></main>}
