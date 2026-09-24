import { Link } from 'react-router-dom'
import './App.css'

function ProductPage() {
  return (
    <div className="app productPage">

      <nav className="navbar">
        <Link to="/" className="logo productLogo">
          <span>MC2</span> Labs
        </Link>

        <Link to="/" className="backButton">
          ← Back to MC2 Labs
        </Link>
      </nav>

      <main className="productHero">
        <div className="productHeroIcon">MC2</div>

        <div className="badge">
          WINDOWS APPLICATION • VERSION 1.1.0
        </div>

        <h1>MC2 Instagram Cleaner</h1>

        <p>
          A Windows desktop utility designed to help you organize and manage
          your own Instagram account using your official Instagram data export.
        </p>

        <div className="heroButtons">
          <a
            className="primaryButton"
            href="/downloads/MC2_Cleaner.exe"
            download="MC2_Cleaner.exe"
          >
            ↓ Download for Windows
          </a>

          <a
            className="secondaryButton"
            href="https://apps.microsoft.com/detail/9NPP2QF73LTG"
            target="_blank"
            rel="noreferrer"
          >
            Get it on Microsoft Store
          </a>

          <a
            className="secondaryButton"
            href="#features"
          >
            Explore Features
          </a>
        </div>

        <div className="storeNotice">
          MC2 Instagram Cleaner is available for Windows.
          Download it directly from MC2 Labs or get it from the Microsoft Store.
        </div>
      </main>

      <section id="features" className="section">
        <div className="sectionTitle">
          <span>FEATURES</span>

          <h2>Built to give you control</h2>

          <p>
            Review your Instagram export data and choose what you want to
            process.
          </p>
        </div>

        <div className="featureGrid">

          <div className="featureBox">
            <div className="featureNumber">01</div>

            <h3>Pending Requests</h3>

            <p>
              Import pending follow request data and review detected accounts
              before starting an operation.
            </p>
          </div>

          <div className="featureBox">
            <div className="featureNumber">02</div>

            <h3>Not Following Back</h3>

            <p>
              Compare following and followers data to identify accounts that
              do not follow you back.
            </p>
          </div>

          <div className="featureBox">
            <div className="featureNumber">03</div>

            <h3>You Stay in Control</h3>

            <p>
              Select accounts before processing and use pause or stop controls
              during operations.
            </p>
          </div>

          <div className="featureBox">
            <div className="featureNumber">04</div>

            <h3>Local Results</h3>

            <p>
              Review progress, activity logs, result files and error
              information stored locally on your device.
            </p>
          </div>

        </div>
      </section>

      <section className="privacySection">

        <div>
          <span>PRIVACY FIRST</span>

          <h2>
            Your password isn't stored by MC2 Instagram Cleaner.
          </h2>
        </div>

        <p>
          Instagram sign-in is performed manually through the browser.
          Imported Instagram data and operation results are processed locally
          on your device.
        </p>

      </section>

      <section className="productInfo">

        <div>
          <span>PLATFORM</span>
          <strong>Windows 10 / 11</strong>
        </div>

        <div>
          <span>VERSION</span>
          <strong>1.1.0</strong>
        </div>

        <div>
          <span>DEVELOPER</span>
          <strong>Mohamed Chedly Yousfi</strong>
        </div>

        <div>
          <span>BRAND</span>
          <strong>MC2 Labs</strong>
        </div>

      </section>

      <footer>

        <div className="logo">
          <span>MC2</span> Labs
        </div>

        <p>
          © 2026 Mohamed Chedly Yousfi. All rights reserved.
        </p>

      </footer>

    </div>
  )
}

export default ProductPage