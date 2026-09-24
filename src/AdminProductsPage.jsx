import { Link, useNavigate } from 'react-router-dom'

function AdminProductsPage() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await fetch(
        'http://localhost:5000/api/auth/logout',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
    } finally {
      navigate('/admin')
    }
  }

  return (
    <div className="dashboardShell">
      <aside className="dashboardSidebar">
        <div className="dashboardBrand">
          <div className="dashboardLogo">MC2</div>

          <div>
            <strong>MC2 Labs</strong>
            <span>Administration</span>
          </div>
        </div>

        <nav className="dashboardMenu">
          <Link to="/admin/dashboard">
            Overview
          </Link>

          <Link
            to="/admin/products"
            className="active"
          >
            Products
          </Link>

          <Link to="/admin/employees">
            Employees
          </Link>

          <Link to="/admin/assistants">
            Assistants
          </Link>

          <Link to="/admin/security">
            Security
          </Link>

          <Link to="/admin/settings">
            Settings
          </Link>
        </nav>

        <button
          className="dashboardLogout"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </aside>

      <main className="dashboardMain">
        <header className="employeesHeader">
          <div>
            <span className="dashboardEyebrow">
              OWNER DASHBOARD
            </span>

            <h1>Products</h1>

            <p>
              Manage MC2 Labs applications and
              digital products.
            </p>
          </div>

          <button
            type="button"
            className="addEmployeeButton"
          >
            + Add Product
          </button>
        </header>

        <section className="employeesPanel">
          <div className="employeesPanelTop">
            <div>
              <span>MC2 LABS PRODUCTS</span>
              <h2>Published products</h2>
            </div>

            <div className="employeesCount">
              1
            </div>
          </div>

          <div className="adminProductCard">
            <div className="adminProductIcon">
              MC2
            </div>

            <div className="adminProductInfo">
              <span>WINDOWS APPLICATION</span>

              <h3>
                MC2 Instagram Cleaner
              </h3>

              <p>
                Version 1.1.0
              </p>
            </div>

            <div className="adminProductStatus">
              Published
            </div>

            <div className="adminProductActions">
              <Link
                to="/products/mc2-instagram-cleaner"
                className="employeeManageButton"
              >
                View
              </Link>

              <button
                type="button"
                className="employeeManageButton"
              >
                Edit
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminProductsPage