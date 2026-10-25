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
  const {room,style,lighting,image,realism}=input||{};
  if(!rooms.has(room)||!styles.has(style)||!lights.has(lighting))return reply({error:"Invalid room, style or lighting"},400);
  if(typeof image!=="string"||image.length>2_900_000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image))return reply({error:"Send PNG screenshot no larger than 2.9MB"},400);
  if(!env.AI)return reply({error:"AI binding is not deployed"},503);
  if(realism!==undefined&&!["photographic","balanced","strict"].includes(realism))return reply({error:"Invalid realism preset"},400);
  const fidelity=realism||"photographic";
  const geometry="Use the input image 0 as the camera framing and architectural composition. Preserve the location and proportions of visible walls, windows and doors, and the room's camera perspective. Do not zoom out or show adjacent rooms, exterior scenery, user interface, or content beyond the image boundaries.";
  const realismInstruction=fidelity==="strict"
    ?"Create a convincing real estate photograph, preserving furniture layout, while improving every material and all lighting substantially. Replace primitive flat furniture with realistic equivalents."
    :fidelity==="balanced"
    ?"Turn this recognizable 3D visualization into an authentic interior photography shot. Replace blocky low-poly furniture with physically believable real-world furniture of the same general type, scale and placement. Use natural wood grain, textured fabric, realistic glass and ceramic, indirect daylight, rich shadow gradients, lens and exposure realism."
    :"CRITICAL: This is NOT a 3D render. Completely transform the plastic, cartoonish, miniature, low-poly source into a convincing photograph of a real built house, as if shot with a professional full-frame interior photography camera. The reference dictates ONLY composition, space boundaries, window and door placement and approximate furniture positions. Reimagine all model-looking furniture as realistic manufactured sofas, dining tables, beds and cabinetry with believable joinery, upholstery seams, fabric texture, natural proportions and fine details. Replace ALL flat colored shapes, block-like placeholders and computer-generated surfaces with authentic plaster, oak veneer, stone, glass, textiles and physically plausible reflections. Use soft global illumination, natural daylight falloff, contact shadows, photographic color grading and realistic optical depth. Professional high-end architectural interior photography, unmistakably a real photograph.";
  const prompt=`${geometry} Room: ${room}. Aesthetic: ${style}. Time/lighting: ${lighting}. ${realismInstruction} No text, watermarks, UI, sketch strokes, 3D wireframes or extraneous adjoining objects.`;
  try {
    const bytes=Uint8Array.from(atob(image.slice(image.indexOf(",")+1)),c=>c.charCodeAt(0));
    const form=new FormData();
    form.append("prompt",prompt);
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