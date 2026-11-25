"use client";
import { useEffect, useRef, useState } from "react";

const VERTEX_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Smooth 3D vertical fluted glass refraction shader with royal cobalt & warm light optics
const FRAGMENT_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_res;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);

  // Subtle architectural glass ribs scaled cleanly across desktop and mobile
  float flutes = mix(14.0, 32.0, clamp((u_res.x - 360.0) / 1080.0, 0.0, 1.0));
  float phase = fract(uv.x * flutes);

  float lens = (phase - 0.5) * 2.0;
  float nx = sin(lens * 1.5707963);
  float nz = sqrt(max(0.06, 1.0 - nx * nx));

  float bevel = pow(1.0 - abs(lens), 5.5);
  float edgeGlow = pow(abs(lens), 9.0);

  vec2 refracted = uv + vec2(nx * 0.028, nx * 0.007 * nz);
  vec2 lightPos = vec2(mix(0.64, 0.82, u_mouse.x), mix(0.24, 0.44, 1.0 - u_mouse.y));
  vec2 drift = vec2(sin(u_time * 0.24) * 0.03, cos(u_time * 0.19) * 0.02);

  vec2 dSun = (refracted - (lightPos + drift)) * vec2(aspect, 1.0);
  float sunField = exp(-dot(dSun, dSun) * 2.15);

  vec2 dWarm = (refracted - vec2(0.84, 0.18)) * vec2(aspect, 1.0);
  float warmBloom = exp(-dot(dWarm, dWarm) * 3.0);

  // Deep royal cobalt palette preserving crisp text contrast across screen heights
  vec3 deepCobalt = vec3(0.039, 0.132, 0.39);
  vec3 midCobalt = vec3(0.078, 0.262, 0.69);
  vec3 skyBlue = vec3(0.24, 0.52, 0.91);
  vec3 sunlitIvory = vec3(0.96, 0.92, 0.80);

  float grad = clamp(refracted.x * 0.46 + (1.0 - refracted.y) * 0.34, 0.0, 1.0);
  vec3 col = mix(deepCobalt, midCobalt, grad);
  col = mix(col, skyBlue, sunField * 0.56);
  col = mix(col, sunlitIvory, warmBloom * 0.34 + sunField * edgeGlow * 0.16);

  // Specular highlights along glass ribs
  col += vec3(0.76, 0.87, 1.0) * edgeGlow * (0.12 + 0.14 * sunField);
  col -= vec3(0.02, 0.05, 0.13) * (1.0 - bevel) * 0.16;

  // Soft bottom vignette for crystal-clear hero footer contrast
  float bottomScrim = smoothstep(0.22, 0.0, uv.y);
  col = mix(col, deepCobalt * 0.86, bottomScrim * 0.35);

  // Gentle optical grain
  float grain = (hash(gl_FragCoord.xy + fract(u_time * 0.08)) - 0.5) * 0.018;
  col += grain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function OpticalPrismFilter({
  className = "",
}: {
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        powerPreference: "low-power",
      });
    } catch {
      gl = null;
    }
    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uRes = gl.getUniformLocation(program, "u_res");

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Cap DPR at 1.5 for silky 60fps mobile GPU throughput
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nextW = Math.max(1, Math.floor(rect.width * dpr));
      const nextH = Math.max(1, Math.floor(rect.height * dpr));
      if (nextW !== width || nextH !== height) {
        width = nextW;
        height = nextH;
        canvas.width = width;
        canvas.height = height;
        gl?.viewport(0, 0, width, height);
      }
    };
    resize();

    let targetX = 0.5;
    let targetY = 0.45;
    let currentX = 0.5;
    let currentY = 0.45;
    let visible = true;
    let raf = 0;
    const start = performance.now();

    const drawFrame = (now: number) => {
      currentX += (targetX - currentX) * 0.045;
      currentY += (targetY - currentY) * 0.045;
      gl?.uniform1f(uTime, reduceMotion ? 0 : (now - start) * 0.001);
      gl?.uniform2f(uMouse, currentX, currentY);
      gl?.uniform2f(uRes, width, height);
      gl?.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const canAnimate = () => visible && !reduceMotion && !document.hidden;

    const tick = (now: number) => {
      if (!canAnimate()) {
        raf = 0;
        return;
      }
      drawFrame(now);
      raf = requestAnimationFrame(tick);
    };

    const ensureLoop = () => {
      if (canAnimate() && !raf) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (reduceMotion) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      targetY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    };

    const ro = new ResizeObserver(() => {
      resize();
      drawFrame(performance.now());
    });
    ro.observe(canvas);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      ensureLoop();
    });
    io.observe(canvas);

    const onVisibility = () => ensureLoop();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    drawFrame(performance.now());
    setReady(true);
    ensureLoop();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      gl?.deleteBuffer(buf);
      gl?.deleteProgram(program);
      gl?.deleteShader(vs);
      gl?.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`optical-prism-canvas ${ready ? "is-ready" : ""} ${className}`}
      aria-hidden="true"
    />
  );
}
