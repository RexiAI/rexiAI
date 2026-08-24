import './App.css'

const capabilities = [
  {
    title: 'Intelligent Agents',
    description:
      'Autonomous AI agents that reason, plan, and execute complex workflows across your stack.',
  },
  {
    title: 'Developer Tools',
    description:
      'CLI-first tooling that amplifies engineering velocity — code generation, review, and deployment automation.',
  },
  {
    title: 'Research Systems',
    description:
      'Deep research pipelines that synthesize information from multiple sources into actionable insights.',
  },
]

const repos = [
  {
    name: 'inglesmiami',
    description: 'Language learning platform powered by AI-driven conversation practice.',
    url: 'https://github.com/RexiAI/inglesmiami',
  },
  {
    name: 'my-engineering-standards',
    description:
      'Shared engineering standards, CI workflows, and agent conventions across all RexiAI projects.',
    url: 'https://github.com/RexiAI/my-engineering-standards',
  },
]

function App() {
  return (
    <div className="site">
      <header className="hero">
        <h1>RexiAI</h1>
        <p className="tagline">Building the next generation of AI-powered developer tools.</p>
      </header>

      <main>
        <section className="section">
          <h2>What We Build</h2>
          <div className="cards">
            {capabilities.map((cap) => (
              <div key={cap.title} className="card">
                <h3>{cap.title}</h3>
                <p>{cap.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Open Source</h2>
          <div className="cards">
            {repos.map((repo) => (
              <div key={repo.name} className="card">
                <h3>
                  <a href={repo.url} target="_blank" rel="noreferrer">
                    {repo.name}
                  </a>
                </h3>
                <p>{repo.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} RexiAI. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
