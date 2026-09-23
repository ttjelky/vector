import './GlassSurface.css';

// Звичайна матова поверхня: простий backdrop-blur без SVG-фільтрів
// заломлення (feDisplacementMap) — саме вони і лагали.
// API пропсів збережено, щоб не чіпати місця використання
// (NavBar, LandingNavBar): зайві пропси просто ігноруються.
const GlassSurface = (props) => {
  const {
    children,
    borderRadius = 20,
    className = '',
    style = {},
    width,
    height,
  } = props;

  const containerStyle = {
    ...style,
    ...(width != null ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height != null ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div className={`glass-surface ${className}`} style={containerStyle}>
      <div className="glass-surface__content">{children}</div>
    </div>
  );
};

export default GlassSurface;
