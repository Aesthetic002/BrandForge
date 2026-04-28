/**
 * script.js — BrandForge frontend logic
 * Direct upload → process → Cloudinary download
 */

// --- Firebase Authentication & Firestore ---
let currentUser = null;

window.addEventListener('firebase-ready', () => {
    if (!window.auth) return;
    
    window.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("Logged in as", user.email);
        } else {
            // Not logged in, redirect to Next.js login page
            window.location.href = "/login";
        }
    });

    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await window.signOut(window.auth);
                window.location.href = "/login";
            } catch (error) {
                console.error("Logout error", error);
            }
        });
    }
});

// Function to save generation to Firestore
async function saveGenerationToFirestore(data, inputs) {
    if (!currentUser || !window.db) return;
    
    try {
        const generationData = {
            uid: currentUser.uid,
            timestamp: window.serverTimestamp(),
            inputs: inputs,
            results: data.results // The Cloudinary URLs
        };
        
        await window.addDoc(window.collection(window.db, "generations"), generationData);
        console.log("Generation saved to Firestore.");
    } catch (e) {
        console.error("Error saving generation: ", e);
    }
}

// --- Shader Background Initialization ---
function initShaderBackground() {
    const container = document.getElementById('shader-container');
    if (!container || !window.THREE) return;

    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `;

    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time*0.05;
        float lineWidth = 0.002;

        vec3 color = vec3(0.0);
        for(int j = 0; j < 3; j++){
          for(int i=0; i < 5; i++){
            color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*5.0 - length(uv) + mod(uv.x+uv.y, 0.2));
          }
        }
        
        gl_FragColor = vec4(color[0],color[1],color[2],1.0);
      }
    `;

    const camera = new THREE.Camera();
    camera.position.z = 1;
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new THREE.Vector2() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    function onWindowResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    }

    onWindowResize();
    window.addEventListener("resize", onWindowResize, false);

    function animate() {
      requestAnimationFrame(animate);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);
    }
    animate();
}

document.addEventListener('DOMContentLoaded', initShaderBackground);

let selectedImages = [];
let logoFile = null;
let processedResults = [];

const imagesUploadZone    = document.getElementById("images-upload-zone");
const imagesInput         = document.getElementById("images-input");
const previewGrid         = document.getElementById("preview-grid");
const logoUploadZone      = document.getElementById("logo-upload-zone");
const logoUploadContent   = document.getElementById("logo-upload-content");
const logoInput           = document.getElementById("logo-input");
const processBtn          = document.getElementById("process-btn");
const statusPanel         = document.getElementById("status-panel");
const statusTitle         = document.getElementById("status-title");
const statusBody          = document.getElementById("status-body");
const spinner             = document.getElementById("spinner");
const resultsGallery      = document.getElementById("results-gallery");
const resultsGrid         = document.getElementById("results-grid");
const downloadAllBtn      = document.getElementById("download-all-btn");

// Image Upload
imagesUploadZone.addEventListener("click", () => imagesInput.click());
imagesInput.addEventListener("change", (e) => addImages(e.target.files));
imagesUploadZone.addEventListener("dragover", (e) => { e.preventDefault(); imagesUploadZone.classList.add("drag-over"); });
imagesUploadZone.addEventListener("dragleave", () => imagesUploadZone.classList.remove("drag-over"));
imagesUploadZone.addEventListener("drop", (e) => { e.preventDefault(); imagesUploadZone.classList.remove("drag-over"); addImages(e.dataTransfer.files); });

function addImages(fileList) {
    for (const file of fileList) {
        if (!["image/jpeg","image/png"].includes(file.type)) continue;
        if (!selectedImages.some(f => f.name === file.name && f.size === file.size)) selectedImages.push(file);
    }
    renderPreviews();
    validateForm();
}

function removeImage(index) { selectedImages.splice(index, 1); renderPreviews(); validateForm(); }

function renderPreviews() {
    previewGrid.innerHTML = "";
    if (selectedImages.length === 0) { imagesUploadZone.style.display = ""; return; }
    imagesUploadZone.style.display = "none";
    selectedImages.forEach((file, i) => {
        const card = document.createElement("div"); card.className = "preview-card";
        const img = document.createElement("img"); img.src = URL.createObjectURL(file); img.alt = file.name; img.className = "preview-img";
        const info = document.createElement("div"); info.className = "preview-info";
        info.innerHTML = '<span class="preview-name">' + truncName(file.name, 18) + '</span>';
        const rm = document.createElement("button"); rm.className = "preview-remove";
        rm.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        rm.onclick = (e) => { e.stopPropagation(); removeImage(i); };
        card.append(img, info, rm); previewGrid.appendChild(card);
    });
    const add = document.createElement("div"); add.className = "preview-card preview-card--add";
    add.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add more</span>';
    add.onclick = () => imagesInput.click();
    previewGrid.appendChild(add);
}

// Logo Upload
logoUploadZone.addEventListener("click", () => logoInput.click());
logoInput.addEventListener("change", (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { alert("Logo too large. Max 5 MB."); return; }
    logoFile = file;
    logoUploadZone.classList.add("has-file");
    logoUploadContent.innerHTML = '<div class="upload-success"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' + truncName(file.name, 24) + '</div>';
    validateForm();
});

// Validation
function validateForm() {
    const e = document.getElementById("email-input").value.trim();
    const p = document.getElementById("phone-input").value.trim();
    const l = document.getElementById("location-input").value.trim();
    const prompt = document.getElementById("image-prompt-input") ? document.getElementById("image-prompt-input").value.trim() : "";
    processBtn.disabled = !((selectedImages.length > 0 || prompt) && logoFile && e && p && l);
}
["email-input","phone-input","location-input","business-name-input","services-input","image-prompt-input"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener("input", validateForm);
});

// Process
processBtn.addEventListener("click", handleProcess);
async function handleProcess() {
    const email = document.getElementById("email-input").value.trim();
    const phone = document.getElementById("phone-input").value.trim();
    const location = document.getElementById("location-input").value.trim();
    const services = document.getElementById("services-input").value.trim();
    const biz = document.getElementById("business-name-input").value.trim();
    const prompt = document.getElementById("image-prompt-input") ? document.getElementById("image-prompt-input").value.trim() : "";

    statusPanel.style.display = "block"; statusBody.innerHTML = "";
    statusTitle.textContent = "Processing..."; spinner.classList.remove("hidden");
    processBtn.disabled = true; resultsGallery.style.display = "none";
    
    let msg = "Processing... ";
    if (selectedImages.length > 0) msg += `Uploading ${selectedImages.length} image(s). `;
    if (prompt) msg += "Generating AI Image... ";
    addMsg("info", msg);

    const fd = new FormData();
    selectedImages.forEach(f => fd.append("images", f));
    fd.append("logo", logoFile);
    fd.append("email", email); fd.append("phone", phone);
    fd.append("location", location); fd.append("services", services);
    fd.append("business_name", biz);
    fd.append("image_prompt", prompt);

    try {
        addMsg("info", "Processing images with overlays...");
        const res = await fetch("/process-images", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Processing failed");

        spinner.classList.add("hidden"); statusTitle.textContent = "Complete!";
        addMsg("success", "Processed " + data.processed + " of " + data.total + " images.");
        if (data.errors) data.errors.forEach(e => addMsg("error", e));

        statusBody.innerHTML += '<div class="results-summary"><div class="result-stat"><span class="stat-number">' + data.total + '</span><span class="stat-label">Total</span></div><div class="result-stat success"><span class="stat-number">' + data.processed + '</span><span class="stat-label">Processed</span></div><div class="result-stat error"><span class="stat-number">' + data.failed + '</span><span class="stat-label">Failed</span></div></div>';

        if (data.results && data.results.length > 0) { 
            processedResults = data.results; 
            renderResults(data.results); 
            
            // Save to Firestore
            saveGenerationToFirestore(data, {
                business_name: biz,
                services: services,
                prompt: prompt || "Uploaded Images"
            });
        }
    } catch (err) {
        spinner.classList.add("hidden"); statusTitle.textContent = "Error"; addMsg("error", err.message);
    } finally { processBtn.disabled = false; validateForm(); }
}

// Results
function renderResults(results) {
    resultsGallery.style.display = "block"; resultsGrid.innerHTML = "";
    results.forEach(item => {
        const card = document.createElement("div"); card.className = "result-card";
        card.innerHTML = '<img src="' + item.url + '" alt="' + item.original_name + '" class="result-img" loading="lazy"><div class="result-card__footer"><span class="result-card__name">' + truncName(item.original_name, 20) + '</span><a href="' + item.url + '" download="' + item.original_name + '" target="_blank" class="btn btn--sm btn--download"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</a></div>';
        resultsGrid.appendChild(card);
    });
    resultsGallery.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Download ZIP
downloadAllBtn.addEventListener("click", async () => {
    if (processedResults.length === 0) return;
    downloadAllBtn.disabled = true;
    downloadAllBtn.innerHTML = '<div class="spinner spinner--sm"></div><span>Creating ZIP...</span>';
    try {
        const zip = new JSZip();
        for (const item of processedResults) {
            try { const r = await fetch(item.url); const b = await r.blob(); zip.file(item.original_name, b); } catch(e) { console.warn(e); }
        }
        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "processed_images.zip"; a.click(); URL.revokeObjectURL(a.href);
    } catch(e) { alert("ZIP failed: " + e.message); }
    finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download All as ZIP';
    }
});

// Utils
function addMsg(type, text) {
    const icons = { info: "\u2139\uFE0F", success: "\u2705", error: "\u274C", warning: "\u26A0\uFE0F" };
    const div = document.createElement("div"); div.className = "status-msg status-msg--" + type;
    div.innerHTML = '<span class="status-icon">' + icons[type] + '</span><span>' + text + '</span>';
    statusBody.appendChild(div); statusBody.scrollTop = statusBody.scrollHeight;
}
function truncName(n, m) {
    if (n.length <= m) return n;
    const ext = n.lastIndexOf(".") !== -1 ? n.slice(n.lastIndexOf(".")) : "";
    return n.slice(0, m - ext.length - 3) + "..." + ext;
}
