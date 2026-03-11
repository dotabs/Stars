import{c as d,r as h,j as y}from"./index-OsZHb5xG.js";const u=[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z",key:"1fy3hk"}]],B=d("bookmark",u),M="#120d0b",k="#f7efe7",f="#d26d47",j=new Set(["https://m.media-amazon.com/images/M/MV5BYzYyN2FiZmUtYWYzMy00MzViLWJkZTMtOGY1ZjgzNWMwN2YxXkEyXkFqcGc@._V1_.jpg","https://m.media-amazon.com/images/M/MV5BMDIxMzBlZDktZjMxNy00ZGI4LTgxNDEtYWRlNzRjMjJmOGQ1XkEyXkFqcGc@._V1_.jpg","https://m.media-amazon.com/images/M/MV5BODZhOWI1ODgtMzdiOS00YjNkLTgwOGUtYmIyZDg5ZmQwMzQ1XkEyXkFqcGc@._V1_.jpg","https://m.media-amazon.com/images/M/MV5BYjk1ZDJlMmUtOWQ0Zi00MDM5LTk1OGYtODczNjFmMGYwZGVkXkEyXkFqcGc@._V1_.jpg"]);function i(t,e={}){const o=e.width??300,a=e.height??450,n=t.split(" "),c=Math.ceil(n.length/2),s=[n.slice(0,c).join(" "),n.slice(c).join(" ")].filter(Boolean),r=s.length===1?248:228,l=34,m=s.map((g,x)=>`<text x="50%" y="${r+x*l}" text-anchor="middle" fill="${k}" font-family="Oswald, Arial, sans-serif" font-size="28" letter-spacing="1">${w(g)}</text>`).join(""),p=`
    <svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${a}" viewBox="0 0 300 450">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1b1412"/>
          <stop offset="55%" stop-color="${M}"/>
          <stop offset="100%" stop-color="#0a0807"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${f}"/>
          <stop offset="100%" stop-color="#f4b684"/>
        </linearGradient>
      </defs>
      <rect width="300" height="450" rx="28" fill="url(#bg)"/>
      <rect x="24" y="24" width="252" height="402" rx="22" fill="none" stroke="rgba(255,255,255,0.12)"/>
      <circle cx="240" cy="70" r="72" fill="${f}" opacity="0.14"/>
      <circle cx="72" cy="372" r="84" fill="#f4b684" opacity="0.08"/>
      <rect x="36" y="54" width="86" height="4" rx="2" fill="url(#accent)"/>
      <text x="36" y="82" fill="#c3b1a3" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="3">STARS</text>
      <text x="36" y="102" fill="#8f8177" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2">TITLE POSTER</text>
      <line x1="36" y1="174" x2="264" y2="174" stroke="rgba(244,182,132,0.22)"/>
      ${m}
      <line x1="36" y1="302" x2="180" y2="302" stroke="rgba(244,182,132,0.22)"/>
      <text x="36" y="332" fill="#c3b1a3" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2">MATCHED TO TITLE</text>
    </svg>
  `;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(p)}`}function w(t){return t.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;")}function G(t){try{const e=new URL(t);if(!e.hostname.includes("image.tmdb.org"))return!0;const o=e.pathname.split("/").pop()??"";return/^[A-Za-z0-9]{10,}\.(jpg|jpeg|png|webp)$/i.test(o)}catch{return!1}}function A(t){return j.has(t)}function b(t,e,o={}){return t?t.startsWith("http")&&(A(t)||!G(t))?i(e,o):t:i(e,o)}function L({src:t,title:e,className:o,width:a,height:n,loading:c}){const s=b(t,e,{width:a,height:n}),[r,l]=h.useState(null),m=r===s?i(e,{width:a,height:n}):s;return y.jsx("img",{"code-path":"src\\components\\ui-custom\\PosterImage.tsx:27:5",src:m,alt:e,className:o,loading:c??"lazy",decoding:"async",onError:()=>l(s)})}export{B,L as P,i as g,b as r};
