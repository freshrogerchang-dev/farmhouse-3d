const ORIGIN = "https://freshrogerchang-dev.github.io";
const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const cors = {"Access-Control-Allow-Origin": ORIGIN,"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, X-Render-Key","Vary":"Origin"};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const rooms=new Set(["客廳與餐廳","主臥室","廚房","衛浴","農舍外觀"]);
const styles=new Set(["日式無印","現代簡約","北歐木質","現代輕奢","台灣鄉村農舍"]);
const lights=new Set(["白天自然光","黃昏暖光","夜間燈光"]);
async function imageBase64(stream) {
  const data=new Uint8Array(await new Response(stream).arrayBuffer());
  if(data.byteLength>8_000_000)throw new Error("Generated image exceeds output limit");
  let parts=[];for(let i=0;i<data.length;i+=8192)parts.push(String.fromCharCode(...data.subarray(i,i+8192)));
  return btoa(parts.join(""));
}
export default {
 async fetch(req,env){
  const url=new URL(req.url);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(url.pathname==="/health"&&req.method==="GET")return reply({ok:true,provider:"Cloudflare Workers AI",model:MODEL,configured:!!env.RENDER_ACCESS_CODE});
  if(url.pathname!=="/render"||req.method!=="POST")return reply({error:"Not found"},404);
  if(req.headers.get("Origin")!==ORIGIN)return reply({error:"Unapproved website origin"},403);
  if(!env.RENDER_ACCESS_CODE||env.RENDER_ACCESS_CODE.length<16)return reply({error:"Render service locked: set a 16+ character RENDER_ACCESS_CODE Worker secret."},503);
  if(req.headers.get("X-Render-Key")!==env.RENDER_ACCESS_CODE)return reply({error:"Incorrect rendering access code"},401);
  const length=Number(req.headers.get("Content-Length")||0);
  if(length>2_900_000)return reply({error:"Image request too large"},413);
  let input;try{input=await req.json()}catch{return reply({error:"Invalid JSON"},400)}
  const {room,style,lighting,image}=input||{};
  if(!rooms.has(room)||!styles.has(style)||!lights.has(lighting))return reply({error:"Invalid room, style or lighting"},400);
  if(typeof image!=="string"||image.length>2_900_000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image))return reply({error:"Send PNG screenshot no larger than 2.9MB"},400);
  if(!env.AI)return reply({error:"AI binding is not deployed"},503);
  const prompt=`Photorealistic architectural interior photograph, transform the provided 3D reference image, room ${room}, ${style} interior design, ${lighting}. STRICT IMAGE-TO-IMAGE EDIT of the exact provided screenshot. The screenshot defines the complete visible field of view and the frame boundaries. Do not zoom out, pan, widen field of view, expand the room, or show anything outside the supplied image. Keep the original camera perspective, number and position of visible furniture, doors, windows and walls. Do not introduce any new side objects, surrounding decorations, extra rooms, plants or furniture. Only replace flat 3D materials with realistic surface textures and improve the existing lighting. Photorealistic materials and shadows; no text or watermarks.`;
  try {
    const bytes=Uint8Array.from(atob(image.slice(image.indexOf(",")+1)),c=>c.charCodeAt(0));
    const form=new FormData();
    form.append("prompt",prompt+" Use image 0 as a strict composition and geometry reference. Keep the same crop and only the objects visible in image 0; do not invent content beyond its edges.");
    form.append("input_image_0",new Blob([bytes],{type:"image/png"}),"room.png");
    form.append("width","1024");form.append("height","768");
    const packed=new Response(form);
    const out=await env.AI.run(MODEL,{multipart:{body:packed.body,contentType:packed.headers.get("content-type")}});
    let b64;
    if(out&&typeof out.image==="string")b64=out.image.includes(",")?out.image.split(",").pop():out.image;
    else if(out&&typeof out.getReader==="function")b64=await imageBase64(out);
    else throw new Error("Unexpected FLUX output: "+JSON.stringify(out).slice(0,180));
    return reply({image:"data:image/png;base64,"+b64,model:MODEL});
  }catch(e){return reply({error:"Workers AI render failed",detail:String(e?.message||e).slice(0,300)},502)}
 }
};