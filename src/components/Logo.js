class FluxStudioLogo {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ?
      document.querySelector(container) : container;
    this.options = {
      width: options.width || 200,
      height: options.height || 60,
      animated: options.animated !== false,
      interactive: options.interactive !== false,
      ...options
    };
    this.init();
  }

  init() {
    if (!this.container) return;

    const svg = this.createSVG();
    this.container.innerHTML = '';
    this.container.appendChild(svg);

    if (this.options.interactive) {
      this.addInteractivity(svg);
    }
  }

  createSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this.options.width);
    svg.setAttribute('height', this.options.height);
    svg.setAttribute('viewBox', '0 0 200 60');
    svg.setAttribute('class', 'flux-studio-logo');

    // Define gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'logoGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');

    const stops = [
      { offset: '0%', color: '#FFD700' },
      { offset: '33%', color: '#FF69B4' },
      { offset: '66%', color: '#4169E1' },
      { offset: '100%', color: '#00CED1' }
    ];

    stops.forEach(stop => {
      const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopEl.setAttribute('offset', stop.offset);
      stopEl.setAttribute('stop-color', stop.color);
      gradient.appendChild(stopEl);
    });

    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Create path dots forming a flowing line
    const dotPositions = [
      { x: 10, y: 30 },
      { x: 25, y: 20 },
      { x: 40, y: 25 },
      { x: 55, y: 15 },
      { x: 70, y: 30 },
      { x: 85, y: 35 },
      { x: 100, y: 25 },
      { x: 115, y: 20 },
      { x: 130, y: 30 },
      { x: 145, y: 35 },
      { x: 160, y: 25 },
      { x: 175, y: 20 },
      { x: 190, y: 30 }
    ];

    // Create connecting path
    const pathData = dotPositions.reduce((acc, pos, i) => {
      if (i === 0) return `M ${pos.x} ${pos.y}`;
      return `${acc} L ${pos.x} ${pos.y}`;
    }, '');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'url(#logoGradient)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', '0.3');
    svg.appendChild(path);

    // Create dots
    dotPositions.forEach((pos, i) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x);
      circle.setAttribute('cy', pos.y);
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', 'url(#logoGradient)');

      if (this.options.animated) {
        const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate.setAttribute('attributeName', 'r');
        animate.setAttribute('values', '3;5;3');
        animate.setAttribute('dur', '2s');
        animate.setAttribute('begin', `${i * 0.1}s`);
        animate.setAttribute('repeatCount', 'indefinite');
        circle.appendChild(animate);
      }

      svg.appendChild(circle);
    });

    // Add text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '100');
    text.setAttribute('y', '50');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'League Spartan, sans-serif');
    text.setAttribute('font-size', '16');
    text.setAttribute('font-weight', '700');
    text.setAttribute('fill', '#000000');
    text.textContent = 'FLUX STUDIO';
    svg.appendChild(text);

    return svg;
  }

  addInteractivity(svg) {
    svg.style.cursor = 'pointer';
    svg.addEventListener('mouseenter', () => {
      const circles = svg.querySelectorAll('circle');
      circles.forEach((circle, i) => {
        setTimeout(() => {
          circle.style.transform = 'scale(1.5)';
          circle.style.transition = 'transform 0.3s ease';
        }, i * 50);
      });
    });

    svg.addEventListener('mouseleave', () => {
      const circles = svg.querySelectorAll('circle');
      circles.forEach(circle => {
        circle.style.transform = 'scale(1)';
      });
    });
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FluxStudioLogo;
}