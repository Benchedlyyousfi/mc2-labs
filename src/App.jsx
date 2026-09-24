import { Routes, Route, Link } from 'react-router-dom'
import ProductPage from './ProductPage.jsx'
import AdminLogin from './AdminLogin.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import EmployeesPage from './EmployeesPage.jsx'
import AssistantsPage from './AssistantsPage.jsx'
import AdminProductsPage from './AdminProductsPage.jsx'
import './App.css'

function HomePage() {
  return (
    <div className="site">
      <header className="navbar">
        <Link to="/" className="brand">
          <div className="brandLogo">MC2</div>

          <div className="brandText">
            <strong>MC2 Labs</strong>
            <span>Technology & Innovation</span>
          </div>
        </Link>

        <nav>
          <a href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="hero" id="home">
          <div className="heroContent">
            <div className="eyebrow">
              MC2 LABS • TECHNOLOGY & INNOVATION
            </div>

            <h1>
              Building useful technology
              <br />
              <span>for the real world.</span>
            </h1>

            <p>
              MC2 Labs creates practical applications,
              digital tools and technology projects
              designed to solve real-world problems.
            </p>

            <div className="heroButtons">
              <a
                href="#products"
                className="primaryButton"
              >
                Explore Products
              </a>

              <a
                href="#about"
                className="secondaryButton"
              >
                About MC2 Labs
              </a>
            </div>
          </div>

          <div className="heroVisual">
            <div className="visualGlow"></div>

            <div className="visualCard">
              <div className="visualLogo">MC2</div>
              <span>LABS</span>
            </div>
          </div>
        </section>

        {/* PRODUCTS */}
        <section
          className="section productsSection"
          id="products"
        >
          <div className="sectionHeading">
            <span>OUR PRODUCTS</span>

            <h2>
              Technology built with purpose.
            </h2>

            <p>
              Explore software and digital products
              developed under MC2 Labs.
            </p>
          </div>

          <div className="productsGrid">
            <article className="productCard featured">
              <div className="productTop">
                <div className="productIcon">
                  MC2
                </div>

                <div className="productBadge">
                  WINDOWS
                </div>
              </div>

              <h3>
                MC2 Instagram Cleaner
              </h3>

              <p>
                A Windows desktop utility for managing
                pending Instagram follow requests and
                identifying accounts that do not follow
                you back using your official Instagram
                data export.
              </p>

              <div className="productMeta">
                <span>Version 1.1.0</span>
                <span>Windows 10 / 11</span>
              </div>

              <Link
                to="/products/mc2-instagram-cleaner"
                className="productLink"
              >
                View Product →
              </Link>
            </article>

            <article className="productCard comingSoon">
              <div className="comingIcon">
                +
              </div>

              <h3>
                More coming soon
              </h3>

              <p>
                New MC2 Labs applications, tools and
                technology projects will appear here.
              </p>

              <span className="comingLabel">
                IN DEVELOPMENT
              </span>
            </article>
          </div>
        </section>

        {/* ABOUT */}
        <section
          className="section aboutSection"
          id="about"
        >
          <div className="sectionHeading">
            <span>ABOUT MC2 LABS</span>

            <h2>
              From ideas to useful technology.
            </h2>
          </div>

          <div className="aboutGrid">
            <div className="aboutText">
              <p>
                MC2 Labs is an independent technology brand founded by
                Mohamed Chedly Yousfi, born in 2008 and based in
                Bir El Hafey, Sidi Bouzid, Tunisia. He is currently
                studying Computer Science at Baccalaureate level at
                Lycée Bir El Hafey, with a growing interest in software
                development, cybersecurity and digital technology.
              </p>

              <p>
                MC2 Labs began with its first software
                project, MC2 Instagram Cleaner, and
                continues to grow as a platform for
                future applications, digital products
                and technology projects.
              </p>

              <div className="acknowledgements">
                <span>ACKNOWLEDGEMENTS</span>

                <p>
                  Special thanks to
                  <strong> Naoufel Yousfi </strong>
                  and
                  <strong> K. Hadded </strong>
                  for their support of MC2 Labs.
                </p>
              </div>
            </div>

            <div className="aboutStats">
              <div>
                <strong>01</strong>
                <span>
                  Published Product
                </span>
              </div>

              <div>
                <strong>MC2</strong>
                <span>
                  Independent Technology Brand
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section
          className="section contactSection"
          id="contact"
        >
          <div>
            <span className="contactEyebrow">
              CONTACT
            </span>

            <h2>
              Get in touch with MC2 Labs.
            </h2>

            <p>
              For questions, feedback or future
              opportunities, contact MC2 Labs directly.
            </p>
          </div>

          <a
            href="mailto:mohamedchedlyyousfi1920@gmail.com"
            className="contactButton"
          >
            mohamedchedlyyousfi1920@gmail.com
          </a>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <div>
          <strong>MC2 Labs</strong>
          <span>Technology & Innovation</span>
        </div>

        <p>
          © 2026 Mohamed Chedly Yousfi.
          All rights reserved.
        </p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route
        path="/"
        element={<HomePage />}
      />

      <Route
        path="/products/mc2-instagram-cleaner"
        element={<ProductPage />}
      />

      {/* ADMIN LOGIN */}
      <Route
        path="/admin"
        element={<AdminLogin />}
      />

      {/* ADMIN DASHBOARD */}
      <Route
        path="/admin/dashboard"
        element={<AdminDashboard />}
      />

      {/* ADMIN PRODUCTS */}
      <Route
        path="/admin/products"
        element={<AdminProductsPage />}
      />

      {/* ADMIN EMPLOYEES */}
      <Route
        path="/admin/employees"
        element={<EmployeesPage />}
      />

      {/* ADMIN ASSISTANTS */}
      <Route
        path="/admin/assistants"
        element={<AssistantsPage />}
      />
    </Routes>
  )
}

export default App