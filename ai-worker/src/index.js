const ORIGIN = "https://freshrogerchang-dev.github.io";
const cors = {"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"};
const answer=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
export default {
 async fetch(request,env){
  if(request.method==="OPTIONS") return new Response(null,{headers:cors});
  if(new URL(request.url).pathname!=="/render" || request.method!=="POST")return answer({error:"POST /render only"},404);
  if(request.headers.get("Origin")!==ORIGIN)return answer({error:"Origin not allowed"},403);
  if(!env.OPENAI_API_KEY)return answer({error:"OPENAI_API_KEY secret is missing"},503);
  const len=Number(request.headers.get("content-length")||0);
  if(len>5_500_000)return answer({error:"Image request exceeds 5.5 MB"},413);
  let input;
  try{input=await request.json()}catch{return answer({error:"Invalid JSON"},400)}
  const {image,room,style,lighting}=input||{};
  if(typeof image!=="string"||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>5_500_000)return answer({error:"Provide a PNG data URI under 5.5 MB"},400);
  if([room,style,lighting].some(v=>typeof v!=="string"||v.length>80))return answer({error:"Invalid room/style/lighting"},400);
  const prompt=`Edit this exact image of an architectural 3D home into a realistic interior design photograph. Location: ${room}. Style: ${style}. Lighting: ${lighting}. Keep the camera position, perspective, spatial layout, wall boundaries, openings and window/door placement as close to the source image as possible. Use credible real-world furniture proportions and materials. Do not add extra rooms or change the building envelope. No text, no floor plan overlay. High quality architectural photography. This is a visualization, not a construction document.`;
  try{
   const imageBytes=Uint8Array.from(atob(image.slice("data:image/png;base64,".length)),ch=>ch.charCodeAt(0));
   const form=new FormData();
   form.append("model","gpt-image-2.5-flare");
   form.append("image",new File([imageBytes],"farmhouse-camera.png",{type:"image/png"}));
   form.append("prompt",prompt);
   form.append("quality","medium");
   form.append("size","1024x1024");
   const r=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:"Bearer "+env.OPENAI_API_KEY},body:form});
   const body=await r.json();
   if(!r.ok)return answer({error:body.error?.message||"AI provider request failed"},r.status>=500?502:400);
   const b64=body.data?.[0]?.b64_json;
   if(!b64)return answer({error:"AI provider returned no image"},502);
   return answer({image:"data:image/png;base64,"+b64});
  }catch(err){return answer({error:"Image generation service error"},502)}
 }
};