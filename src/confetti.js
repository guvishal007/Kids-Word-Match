// Kids Matcher Confetti Particle Engine

let canvas = null;
let ctx = null;
let animationId = null;
let particles = [];
const maxParticles = 120;
let isAnimating = false;

const colors = [
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ff7849', // Orange
  '#ff49db'  // Pink
];

class Particle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.reset(true); // Initial load: start from bottom corners (party poppers style)
  }

  reset(fromBottom = false) {
    // Left or right corner launch
    const fromLeft = Math.random() > 0.5;
    
    if (fromBottom) {
      this.x = fromLeft ? Math.random() * 80 : this.canvasWidth - Math.random() * 80;
      this.y = this.canvasHeight + 10;
      this.vx = fromLeft ? (Math.random() * 8 + 4) : -(Math.random() * 8 + 4);
      this.vy = -(Math.random() * 12 + 10);
    } else {
      // Regrow particles from top
      this.x = Math.random() * this.canvasWidth;
      this.y = -20;
      this.vx = Math.random() * 4 - 2;
      this.vy = Math.random() * 4 + 2;
    }

    this.size = Math.random() * 10 + 6;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.shape = Math.random() > 0.4 ? 'circle' : (Math.random() > 0.5 ? 'star' : 'rect');
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 4 - 2;
    this.gravity = 0.22;
    this.opacity = 1;
    this.fadeOutSpeed = Math.random() * 0.005 + 0.005;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.99; // Air resistance
    this.rotation += this.rotationSpeed;
    this.opacity -= this.fadeOutSpeed;

    // Check boundaries or fade out completion
    if (this.opacity <= 0 || this.y > this.canvasHeight + 20 || this.x < -20 || this.x > this.canvasWidth + 20) {
      return false; // Request deletion/reset
    }
    return true;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    } else if (this.shape === 'star') {
      ctx.beginPath();
      // Simple 5-pointed star path
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size / 2, 
                   -Math.sin((18 + i * 72) * Math.PI / 180) * this.size / 2);
        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * this.size / 4, 
                   -Math.sin((54 + i * 72) * Math.PI / 180) * this.size / 4);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function handleResize() {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

function loop() {
  if (!isAnimating) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let activeParticles = 0;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const isAlive = p.update();
    if (isAlive) {
      p.draw();
      activeParticles++;
    }
  }

  if (activeParticles > 0) {
    animationId = requestAnimationFrame(loop);
  } else {
    stopConfetti();
  }
}

export function startConfetti() {
  canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  
  window.addEventListener('resize', handleResize);
  handleResize();

  particles = [];
  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle(canvas.width, canvas.height));
  }

  isAnimating = true;
  if (animationId) cancelAnimationFrame(animationId);
  loop();

  // Auto shut down after 4.5 seconds to preserve processing
  setTimeout(() => {
    // Fade out remaining particles
    particles.forEach(p => {
      p.fadeOutSpeed = 0.05; // Force fast exit
    });
  }, 3000);
}

export function stopConfetti() {
  isAnimating = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  window.removeEventListener('resize', handleResize);
}
