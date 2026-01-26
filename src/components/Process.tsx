
export function Process() {
  const steps = [
    {
      emoji: '🧭',
      title: 'Discover',
      description: 'Clarify your goals, theme, music, and constraints.',
      details: [
        'Vision alignment',
        'Theme exploration',
        'Music analysis',
        'Constraint mapping'
      ],
      duration: 'Foundation',
      color: 'from-blue-500 to-blue-600',
      accent: 'blue'
    },
    {
      emoji: '🎨',
      title: 'Ideate',
      description: 'Mood boards, sketches, and early ideas.',
      details: [
        'Mood board creation',
        'Initial sketches',
        'Concept exploration',
        'Creative brainstorming'
      ],
      duration: 'Exploration',
      color: 'from-yellow-500 to-orange-500',
      accent: 'yellow'
    },
    {
      emoji: '⚙️',
      title: 'Refine',
      description: 'Feedback, iteration, and storyboard development.',
      details: [
        'Feedback integration',
        'Design iteration',
        'Storyboard creation',
        'Concept refinement'
      ],
      duration: 'Development',
      color: 'from-purple-500 to-purple-600',
      accent: 'purple'
    },
    {
      emoji: '🎯',
      title: 'Implement',
      description: 'Final deliverables: drill maps, staging layouts, prop visuals.',
      details: [
        'Drill maps',
        'Staging layouts',
        'Prop visuals',
        'Technical specs'
      ],
      duration: 'Delivery',
      color: 'from-green-500 to-emerald-600',
      accent: 'green'
    },
    {
      emoji: '🤝',
      title: 'Support',
      description: 'Rehearsal feedback, mid-season updates, and finishing touches.',
      details: [
        'Rehearsal feedback',
        'Mid-season updates',
        'Performance notes',
        'Final adjustments'
      ],
      duration: 'Ongoing',
      color: 'from-pink-500 to-rose-600',
      accent: 'pink'
    }
  ];

  return (
    <section id="process">
      <div>
        <div className="text-center mb-20">
          <h2 className="text-display text-5xl md:text-7xl lg:text-8xl mb-6 text-off-white" style={{ fontFamily: 'var(--font-title)' }}>
            OUR PROCESS
          </h2>
          <p className="text-xl text-off-white/70 max-w-3xl mx-auto">
            How we bring ideas to life reflects our ethos: <strong className="text-off-white">Design in Motion.</strong>
          </p>
        </div>

        {/* Process cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
          {steps.map((step, index) => {
            return (
              <div key={index} className="group relative">
                {/* Process card */}
                <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 h-full transition-all duration-500 hover:border-white/40 hover:bg-black/60 hover:transform hover:scale-105">

                  {/* Step number - High contrast */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-12 h-12 rounded-xl bg-${step.accent}-600 flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                      {index + 1}
                    </div>
                    <div className={`w-16 h-16 rounded-2xl bg-${step.accent}-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-3xl">{step.emoji}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white group-hover:gradient-text transition-all duration-300" style={{ fontFamily: 'var(--font-heading)' }}>
                      {step.title}
                    </h3>

                    <p className="text-white/80 text-sm leading-relaxed">
                      {step.description}
                    </p>

                    {/* Details list */}
                    <div className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center text-xs text-white/60">
                          <div className={`w-2 h-2 rounded-full bg-${step.accent}-500 mr-3 flex-shrink-0`}></div>
                          {detail}
                        </div>
                      ))}
                    </div>

                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-${step.accent}-600 text-white`}>
                      {step.duration}
                    </div>
                  </div>

                  {/* Progress connector line for desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-white/20 to-transparent transform -translate-y-1/2 z-10"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Process flow visualization */}
        <div className="text-center">
          <p className="text-white/60 mb-8 max-w-2xl mx-auto">
            Our process is designed to be collaborative and iterative, ensuring that your vision comes to life exactly as you imagined—or even better.
          </p>
          <div className="flex items-center justify-center space-x-2 text-white/40">
            <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
            <div className="w-8 h-1 bg-yellow-500 rounded-full"></div>
            <div className="w-8 h-1 bg-purple-500 rounded-full"></div>
            <div className="w-8 h-1 bg-green-500 rounded-full"></div>
          </div>
        </div>

      </div>
    </section>
  );
}