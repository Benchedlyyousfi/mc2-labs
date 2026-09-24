import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function EmployeesPage() {
  const navigate = useNavigate()

  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [statusId, setStatusId] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Manage / permissions
  const [manageEmployee, setManageEmployee] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissionsSaving, setPermissionsSaving] = useState(false)

  async function loadEmployees() {
    try {
      setError('')

      const response = await fetch(
        'http://localhost:5000/api/admin/employees',
        {
          method: 'GET',
          credentials: 'include',
        }
      )

      if (response.status === 401) {
        navigate('/admin')
        return
      }

      if (response.status === 403) {
        setError('Owner access is required.')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to load employees.'
        )
      }

      setEmployees(data.employees || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      const response = await fetch(
        'http://localhost:5000/api/admin/employees',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        navigate('/admin')
        return
      }

      if (response.status === 403) {
        throw new Error('Owner access is required.')
      }

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to create employee.'
        )
      }

      setName('')
      setEmail('')
      setPassword('')
      setShowForm(false)

      setMessage('Employee created successfully.')

      await loadEmployees()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(employee) {
    const confirmed = window.confirm(
      `Delete ${employee.name}?\n\n` +
        `Email: ${employee.email}\n\n` +
        'This action will permanently delete the employee account.'
    )

    if (!confirmed) {
      return
    }

    setDeletingId(employee.id)
    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/employees/${employee.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        navigate('/admin')
        return
      }

      if (response.status === 403) {
        throw new Error('Owner access is required.')
      }

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to delete employee.'
        )
      }

      if (manageEmployee?.id === employee.id) {
        closeManage()
      }

      setMessage(
        `${employee.name} was deleted successfully.`
      )

      await loadEmployees()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleStatus(employee) {
    const newStatus = !Boolean(employee.is_active)

    const action = newStatus ? 'enable' : 'disable'

    const confirmed = window.confirm(
      `${newStatus ? 'Enable' : 'Disable'} ${employee.name}?\n\n` +
        (newStatus
          ? 'The employee will be able to use the account again.'
          : 'The employee will no longer be able to access protected MC2 Labs resources.')
    )

    if (!confirmed) {
      return
    }

    setStatusId(employee.id)
    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/employees/${employee.id}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_active: newStatus,
          }),
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        navigate('/admin')
        return
      }

      if (response.status === 403) {
        throw new Error('Owner access is required.')
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Unable to ${action} employee.`
        )
      }

      setMessage(
        `${employee.name} was ${
          newStatus ? 'enabled' : 'disabled'
        } successfully.`
      )

      setManageEmployee((current) =>
        current?.id === employee.id
          ? {
              ...current,
              is_active: newStatus,
            }
          : current
      )

      await loadEmployees()
    } catch (err) {
      setError(err.message)
    } finally {
      setStatusId(null)
    }
  }

  async function openManage(employee) {
    setManageEmployee(employee)
    setPermissions([])
    setSelectedPermissions([])
    setPermissionsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/employees/${employee.id}/permissions`,
        {
          method: 'GET',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        navigate('/admin')
        return
      }

      if (response.status === 403) {
        throw new Error('Owner access is required.')
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to load employee permissions.'
        )
      }

      const loadedPermissions = data.permissions || []

      setPermissions(loadedPermissions)

      setSelectedPermissions(
        loadedPermissions
          .filter((permission) => Boolean(permission.granted))
          .map((permission) => permission.permission_key)
      )

      if (data.employee) {
        setManageEmployee(data.employee)
      }
    } catch (err) {
      setError(err.message)
      setManageEmployee(null)
    } finally {
      setPermissionsLoading(false)
    }
  }

  function closeManage() {
    setManageEmployee(null)
    setPermissions([])
    setSelectedPermissions([])
    setPermissionsLoading(false)
    setPermissionsSaving(false)
  }

  function togglePermission(permissionKey) {
    setSelectedPermissions((current) => {
      if (current.includes(permissionKey)) {
        return current.filter(
          (permission) => permission !== permissionKey
        )
      }

      return [...current, permissionKey]
    })
  }

  async function savePermissions() {
    if (!manageEmployee) {
      return
    }

    setPermissionsSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/employees/${manageEmployee.id}/permissions`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            permissions: selectedPermissions,
          }),
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        navigate('/admin')
        return
      }

      if (response.status === 403) {
        throw new Error('Owner access is required.')
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to update employee permissions.'
        )
      }

      setMessage(
        `Permissions for ${manageEmployee.name} were saved successfully.`
      )

      closeManage()
    } catch (err) {
      setError(err.message)
    } finally {
      setPermissionsSaving(false)
    }
  }

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

  function permissionTitle(permissionKey) {
    const titles = {
      'products.view': 'View products',
      'products.manage': 'Manage products',
      'employees.view': 'View employees',
      'employees.manage': 'Manage employees',
      'assistants.view': 'View assistants',
      'assistants.manage': 'Manage assistants',
      'security.view': 'View security',
      'settings.manage': 'Manage settings',
    }

    return titles[permissionKey] || permissionKey
  }

  return (
    <div className="dashboardShell">
      <aside className="dashboardSidebar">
        <div className="dashboardBrand">
          <div className="dashboardLogo">
            MC2
          </div>

          <div>
            <strong>MC2 Labs</strong>
            <span>Administration</span>
          </div>
        </div>

        <nav className="dashboardMenu">
            <Link to="/admin/dashboard">
                Overview
            </Link>

            <Link to="/admin/products">
                Products
            </Link>

            <Link
                to="/admin/employees"
                className="active"
            >
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

            <h1>Employees</h1>

            <p>
              Manage MC2 Labs employee accounts
              and access.
            </p>
          </div>

          <button
            className="addEmployeeButton"
            onClick={() => {
              setShowForm(!showForm)
              setError('')
              setMessage('')
            }}
          >
            {showForm
              ? 'Cancel'
              : '+ Add Employee'}
          </button>
        </header>

        {message && (
          <div className="employeeSuccess">
            {message}
          </div>
        )}

        {error && (
          <div className="employeeError">
            {error}
          </div>
        )}

        {showForm && (
          <section className="employeeFormCard">
            <div className="employeeFormHeading">
              <span>NEW ACCOUNT</span>

              <h2>Create employee</h2>

              <p>
                The password is protected with
                Argon2id before being stored.
              </p>
            </div>

            <form
              className="employeeForm"
              onSubmit={handleSubmit}
            >
              <label>
                Full name

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Employee name"
                  required
                  minLength="2"
                  maxLength="100"
                  autoComplete="off"
                />
              </label>

              <label>
                Email address

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="employee@example.com"
                  required
                  autoComplete="off"
                />
              </label>

              <label>
                Temporary password

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Minimum 12 characters"
                  required
                  minLength="12"
                  maxLength="128"
                  autoComplete="new-password"
                />
              </label>

              <button
                type="submit"
                className="createEmployeeButton"
                disabled={submitting}
              >
                {submitting
                  ? 'Creating...'
                  : 'Create Employee'}
              </button>
            </form>
          </section>
        )}

        {manageEmployee && (
          <section className="employeeManageCard">
            <div className="employeeManageTop">
              <div>
                <span className="dashboardEyebrow">
                  ACCESS CONTROL
                </span>

                <h2>
                  Manage {manageEmployee.name}
                </h2>

                <p>
                  {manageEmployee.email}
                </p>
              </div>

              <button
                type="button"
                className="employeeManageClose"
                onClick={closeManage}
              >
                ×
              </button>
            </div>

            <div className="employeeManageStatus">
              <div>
                <strong>Account status</strong>

                <span>
                  {Boolean(manageEmployee.is_active)
                    ? 'Employee account is active.'
                    : 'Employee account is disabled.'}
                </span>
              </div>

              <button
                type="button"
                className={
                  Boolean(manageEmployee.is_active)
                    ? 'employeeDisableButton'
                    : 'employeeEnableButton'
                }
                disabled={
                  statusId === manageEmployee.id
                }
                onClick={() =>
                  handleStatus(manageEmployee)
                }
              >
                {statusId === manageEmployee.id
                  ? 'Updating...'
                  : Boolean(manageEmployee.is_active)
                    ? 'Disable Employee'
                    : 'Enable Employee'}
              </button>
            </div>

            <div className="permissionsSection">
              <div className="permissionsHeading">
                <div>
                  <strong>Permissions</strong>

                  <p>
                    Choose what this employee can
                    access inside MC2 Labs.
                  </p>
                </div>

                <span>
                  {selectedPermissions.length} selected
                </span>
              </div>

              {permissionsLoading ? (
                <div className="permissionsLoading">
                  Loading permissions...
                </div>
              ) : (
                <div className="permissionsGrid">
                  {permissions.map((permission) => {
                    const checked =
                      selectedPermissions.includes(
                        permission.permission_key
                      )

                    return (
                      <label
                        className={
                          checked
                            ? 'permissionCard selected'
                            : 'permissionCard'
                        }
                        key={permission.id}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            togglePermission(
                              permission.permission_key
                            )
                          }
                        />

                        <div>
                          <strong>
                            {permissionTitle(
                              permission.permission_key
                            )}
                          </strong>

                          <span>
                            {permission.description ||
                              permission.permission_key}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}

              <div className="permissionsActions">
                <button
                  type="button"
                  className="permissionsCancelButton"
                  onClick={closeManage}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="permissionsSaveButton"
                  onClick={savePermissions}
                  disabled={
                    permissionsLoading ||
                    permissionsSaving
                  }
                >
                  {permissionsSaving
                    ? 'Saving...'
                    : 'Save Permissions'}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="employeesPanel">
          <div className="employeesPanelTop">
            <div>
              <span>MC2 LABS TEAM</span>
              <h2>Employee accounts</h2>
            </div>

            <div className="employeesCount">
              {employees.length}
            </div>
          </div>

          {loading ? (
            <div className="employeesEmpty">
              Loading employees...
            </div>
          ) : employees.length === 0 ? (
            <div className="employeesEmpty">
              <strong>No employees yet</strong>

              <p>
                Create your first employee account
                using the Add Employee button.
              </p>
            </div>
          ) : (
            <div className="employeesTableWrapper">
              <table className="employeesTable">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div className="employeeIdentity">
                          <div className="employeeAvatar">
                            {employee.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {employee.name}
                            </strong>

                            <span>
                              EMPLOYEE #{employee.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>{employee.email}</td>

                      <td>
                        <span
                          className={
                            employee.is_active
                              ? 'employeeStatus active'
                              : 'employeeStatus disabled'
                          }
                        >
                          {employee.is_active
                            ? 'Active'
                            : 'Disabled'}
                        </span>
                      </td>

                      <td>
                        {employee.last_login_at
                          ? new Date(
                              employee.last_login_at
                            ).toLocaleString()
                          : 'Never'}
                      </td>

                      <td>
                        <div className="employeeActions">
                          <button
                            type="button"
                            className="employeeManageButton"
                            onClick={() =>
                              openManage(employee)
                            }
                          >
                            Manage
                          </button>

                          <button
                            type="button"
                            className="employeeDeleteButton"
                            onClick={() =>
                              handleDelete(employee)
                            }
                            disabled={
                              deletingId === employee.id
                            }
                          >
                            {deletingId === employee.id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default EmployeesPage