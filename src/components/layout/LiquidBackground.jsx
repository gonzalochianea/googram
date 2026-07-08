import "../../styles/LiquidBackground.css";

function LiquidBackground() {
  return (
    <div className="liquid-bg-container">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>
        
        <div className="neon-lines-container">
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="neon-svg">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="15" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path className="neon-path neon-blue" d="M -200,400 C 200,800 500,100 1200,500" filter="url(#glow)"/>
            <path className="neon-path neon-pink" d="M -200,600 C 300,100 700,900 1200,400" filter="url(#glow)"/>
            <path className="neon-path neon-purple" d="M -200,200 C 400,900 800,200 1200,700" filter="url(#glow)"/>
          </svg>
        </div>
    </div>
  );
}

export default LiquidBackground;
