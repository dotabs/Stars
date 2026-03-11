import{c as x,r as h,j as y}from"./index-ByyxHIUb.js";const u=[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z",key:"1fy3hk"}]],z=x("bookmark",u),k="#120d0b",M="#f7efe7",m="#d26d47",b=new Set(["https://m.media-amazon.com/images/M/MV5BYzYyN2FiZmUtYWYzMy00MzViLWJkZTMtOGY1ZjgzNWMwN2YxXkEyXkFqcGc@._V1_.jpg","https://m.media-amazon.com/images/M/MV5BMDIxMzBlZDktZjMxNy00ZGI4LTgxNDEtYWRlNzRjMjJmOGQ1XkEyXkFqcGc@._V1_.jpg","https://m.media-amazon.com/images/M/MV5BODZhOWI1ODgtMzdiOS00YjNkLTgwOGUtYmIyZDg5ZmQwMzQ1XkEyXkFqcGc@._V1_.jpg","https://m.media-amazon.com/images/M/MV5BYjk1ZDJlMmUtOWQ0Zi00MDM5LTk1OGYtODczNjFmMGYwZGVkXkEyXkFqcGc@._V1_.jpg"]);function a(t,e={}){const o=e.width??300,i=e.height??450,n=t.split(" "),s=Math.ceil(n.length/2),r=[n.slice(0,s).join(" "),n.slice(s).join(" ")].filter(Boolean),c=r.length===1?286:272,l=30,f=r.map((p,d)=>`<text x="50%" y="${c+d*l}" text-anchor="middle" fill="${M}" font-family="Oswald, Arial, sans-serif" font-size="24" letter-spacing="1">${w(p)}</text>`).join(""),g=`
    <svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${i}" viewBox="0 0 300 450">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1b1412"/>
          <stop offset="55%" stop-color="${k}"/>
          <stop offset="100%" stop-color="#0a0807"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${m}"/>
          <stop offset="100%" stop-color="#f4b684"/>
        </linearGradient>
      </defs>
      <rect width="300" height="450" rx="28" fill="url(#bg)"/>
      <rect x="24" y="24" width="252" height="402" rx="22" fill="none" stroke="rgba(255,255,255,0.12)"/>
      <circle cx="240" cy="70" r="72" fill="${m}" opacity="0.14"/>
      <circle cx="72" cy="372" r="84" fill="#f4b684" opacity="0.08"/>
      <rect x="36" y="54" width="86" height="4" rx="2" fill="url(#accent)"/>
      <text x="36" y="82" fill="#c3b1a3" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="3">STARS</text>
      <text x="36" y="102" fill="#8f8177" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2">POSTER COMING SOON</text>
      <g opacity="0.9">
        <rect x="93" y="136" width="114" height="86" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(244,182,132,0.2)"/>
        <rect x="112" y="154" width="76" height="50" rx="10" fill="rgba(244,182,132,0.08)" stroke="rgba(244,182,132,0.25)"/>
        <circle cx="132" cy="171" r="6" fill="#f4b684"/>
        <path d="M120 196l18-16 14 12 13-10 15 14" fill="none" stroke="#f7efe7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M100 146h100" stroke="rgba(244,182,132,0.16)" stroke-width="2"/>
      </g>
      <line x1="36" y1="246" x2="264" y2="246" stroke="rgba(244,182,132,0.22)"/>
      ${f}
      <line x1="36" y1="336" x2="204" y2="336" stroke="rgba(244,182,132,0.22)"/>
      <text x="36" y="366" fill="#c3b1a3" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2">ARTWORK PENDING</text>
    </svg>
  `;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(g)}`}function w(t){return t.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;")}function G(t){try{const e=new URL(t);if(!e.hostname.includes("image.tmdb.org"))return!0;const o=e.pathname.split("/").pop()??"";return/^[A-Za-z0-9]{10,}\.(jpg|jpeg|png|webp)$/i.test(o)}catch{return!1}}function j(t){return b.has(t)}function A(t,e,o={}){return t?t.startsWith("http")&&(j(t)||!G(t))?a(e,o):t:a(e,o)}function B({src:t,title:e,className:o,width:i,height:n,loading:s}){const r=A(t,e,{width:i,height:n}),[c,l]=h.useState(null),f=c===r?a(e,{width:i,height:n}):r;return y.jsx("img",{"code-path":"src\\components\\ui-custom\\PosterImage.tsx:27:5",src:f,alt:e,className:o,loading:s??"lazy",decoding:"async",onError:()=>l(r)})}export{z as B,B as P,a as g,A as r};
