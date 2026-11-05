// Deterministic platform-size conversion of the existing approved Laço artwork.
import sharp from 'sharp';
import {readdir} from 'node:fs/promises';
const source='public/assets/laco-icon.png';
for(const folder of await readdir('android/app/src/main/res')){
 const path='android/app/src/main/res/'+folder;
 if(folder.startsWith('mipmap-')&&!folder.includes('anydpi'))for(const file of await readdir(path)){
  if(!file.endsWith('.png'))continue;
  const {width,height}=await sharp(path+'/'+file).metadata();
  let image=sharp(source);
  if(file.includes('foreground')){const size=Math.round(width*.62),edge=Math.floor((width-size)/2);image=image.resize(size,size).extend({top:edge,bottom:height-size-edge,left:edge,right:width-size-edge,background:'#082d3f'});}else image=image.resize(width,height);
  await image.png().toFile(path+'/'+file+'.new');
  await (await import('node:fs/promises')).rename(path+'/'+file+'.new',path+'/'+file);
 }
 if(folder.startsWith('drawable-'))for(const file of await readdir(path))if(file==='splash.png'){
  const {width,height}=await sharp(path+'/'+file).metadata();
  const size=Math.round(Math.min(width,height)*.32);
  const icon=await sharp(source).resize(size,size).png().toBuffer();
  await sharp({create:{width,height,channels:3,background:'#082d3f'}}).composite([{input:icon,gravity:'centre'}]).png().toFile(path+'/'+file+'.new');
  await (await import('node:fs/promises')).rename(path+'/'+file+'.new',path+'/'+file);
 }
}
await sharp(source).resize(1024,1024).flatten({background:'#082d3f'}).removeAlpha().png().toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
for(const file of await readdir('ios/App/App/Assets.xcassets/Splash.imageset'))if(file.endsWith('.png')){
 const icon=await sharp(source).resize(720,720).png().toBuffer();
 await sharp({create:{width:2732,height:2732,channels:3,background:'#082d3f'}}).composite([{input:icon,gravity:'centre'}]).png().toFile('ios/App/App/Assets.xcassets/Splash.imageset/'+file);
}
console.log('Ícones e ecrãs de arranque Laço preparados.');
