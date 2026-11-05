'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,Eye,EyeOff,KeyRound,Lock,ShieldCheck} from 'lucide-react';
import {authFetch,getSupabaseBrowser} from '../../lib/supabase/browser';
export default function Profile(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[success,setSuccess]=useState(false),[busy,setBusy]=useState(false),[visible,setVisible]=useState(false);
 const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 useEffect(()=>{let mounted=true;async function load(){try{const {data:auth,error}=await getSupabaseBrowser().auth.getUser();if(error||!auth.user){window.location.replace('/login');return;}const r=await authFetch('/api/state');const d=await r.json();if(!r.ok)throw new Error(d.error);if(mounted)setData(d);}catch(e){if(mounted)setError(e.message||'Não foi possível abrir o perfil.');}}load();const {data:listener}=getSupabaseBrowser().auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')window.location.replace('/login')});return()=>{mounted=false;listener.subscription.unsubscribe()};},[]);
 async function submit(event){
  event.preventDefault();if(busy||!data?.profile?.canChangePassword)return;
  setError('');setSuccess(false);
  if(password.length<12||password.length>128)return setError('Use entre 12 e 128 caracteres para a nova palavra-passe.');
  if(password!==confirmation)return setError('A confirmação não corresponde à nova palavra-passe.');
  if(password===current)return setError('Escolha uma palavra-passe diferente da atual.');
  setBusy(true);
  try{
   const client=getSupabaseBrowser();
   const {data:reauth,error:signInError}=await client.auth.signInWithPassword({email:data.user.email,password:current});
   if(signInError||!reauth.user)throw new Error('Não foi possível confirmar a palavra-passe atual. Verifique os dados e tente novamente.');
   const permit=await authFetch('/api/profile/password-permit',{method:'POST'});
   const result=await permit.json();if(!permit.ok)throw new Error(result.error);
   const {error:updateError}=await client.auth.updateUser({password});
   if(updateError)throw new Error(updateError.code==='weak_password'?'Escolha uma palavra-passe mais forte.':'Não foi possível alterar a palavra-passe. Tente novamente.');
   setSuccess(true);
   const {error:sessionError}=await client.auth.signOut({scope:'others'});
   if(sessionError)setError('A palavra-passe foi alterada, mas não foi possível terminar as outras sessões. Entre novamente nos seus dispositivos.');
  }catch(e){setError(e.message||'Não foi possível alterar a palavra-passe.');}
  finally{setCurrent('');setPassword('');setConfirmation('');setBusy(false);}
 }
 const allowed=data?.profile?.canChangePassword===true;
 return <div className="profile-page"><header className="profile-header"><a href="/" className="access-brand"><img src="/assets/laco-icon.png" alt=""/><span>Laço<small>Sempre por perto.</small></span></a><a className="btn secondary" href="/plataforma"><ArrowLeft size={16}/>Voltar à plataforma</a></header><main className="profile-main"><div className="profile-intro"><span className="access-eyebrow">A SUA CONTA LAÇO</span><h1>O meu perfil</h1><p>O seu espaço de confiança.</p></div>{error&&<p className="profile-error" role="alert">{error}</p>}{!data?<p role="status">A verificar o seu perfil…</p>:<div className="profile-grid"><section className="panel profile-identity"><span className="profile-symbol"><ShieldCheck size={28}/></span><h2>{data.user.name}</h2><p>{data.user.email}</p><span className="badge green">{data.profile.minor?'Familiar menor':data.superadmin?'Superadministrador':allowed?'Familiar adulto':'Conta por associar'}</span><div className="profile-note"><Lock size={17}/><span>A segurança da sua conta acompanha o seu círculo.</span></div></section><section className="panel profile-password"><span className="profile-symbol"><KeyRound size={26}/></span><h2>Palavra-passe</h2>{allowed?<><p>Confirme a palavra-passe atual e escolha uma nova.</p>{success&&<p className="profile-success" role="status"><CheckCircle2 size={18}/>Palavra-passe alterada com sucesso.</p>}<form onSubmit={submit}><label>Palavra-passe atual<input type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} required disabled={busy}/></label><label>Nova palavra-passe<div className="profile-password-field"><input type={visible?'text':'password'} autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} aria-describedby="password-help" required disabled={busy}/><button type="button" aria-label={visible?'Ocultar nova palavra-passe':'Mostrar nova palavra-passe'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><small id="password-help">Entre 12 e 128 caracteres. Combine várias palavras ou letras, números e símbolos.</small></label><label>Confirmar nova palavra-passe<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={e=>setConfirmation(e.target.value)} required disabled={busy}/></label><button className="btn primary" type="submit" disabled={busy}>{busy?'A alterar…':'Alterar palavra-passe'}<ArrowRight size={16}/></button></form></>:<div className="profile-locked"><Lock size={23}/><p>{data.profile.minor?'A alteração de palavra-passe não está disponível nas contas de menores.':'Aguarde a associação da conta a uma família como adulto.'}</p></div>}</section></div>}</main><footer className="profile-footer">Laço · Sempre por perto.</footer></div>;
}
