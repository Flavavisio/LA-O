'use client';
import {useEffect,useState} from 'react';
import {getSupabaseBrowser} from '../../lib/supabase/browser';
import Dashboard from '../ui';
export default function Gate(){const [ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let mounted=true;const client=getSupabaseBrowser();
 async function check(){try{const {data,error}=await client.auth.getUser();if(!mounted)return;if(error||!data.user){window.location.replace('/login');return;}setReady(true)}catch{if(mounted)setError('Não foi possível verificar a sessão. Tente novamente.')}}
 check();const {data:listener}=client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')window.location.replace('/login')});
 return()=>{mounted=false;listener.subscription.unsubscribe()};},[]);
 if(!ready)return <div className="session-check"><img src="/assets/laco-icon.png" alt="Laço"/><p role="status">{error||'A verificar o seu acesso…'}</p>{error&&<a href="/login">Voltar ao login</a>}</div>;
 return <Dashboard initialDemo={false}/>;
}
