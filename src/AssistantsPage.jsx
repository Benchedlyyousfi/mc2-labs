import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function AssistantsPage() {
  const navigate = useNavigate()

  const [assistants, setAssistants] = useState([])
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

  const [manageAssistant, setManageAssistant] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissionsSaving, setPermissionsSaving] = useState(false)

  async function loadAssistants() {
    try {
      setError('')

      const response = await fetch(
        'http://localhost:5000/api/admin/assistants',
        {
          credentials: 'include',
        }
      )

      if (response.status === 401) {
        navigate('/admin')
        return
      }

      if (response.status === 403) {
        throw new Error('Owner access is required.')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to load assistants.'
        )
      }

      setAssistants(data.assistants || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssistants()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()

    setSubmitting(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(
        'http://localhost:5000/api/admin/assistants',
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

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to create assistant.'
        )
      }

      setName('')
      setEmail('')
      setPassword('')
      setShowForm(false)

      setMessage('Assistant created successfully.')

      await loadAssistants()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function openManage(assistant) {
    setManageAssistant(assistant)
    setPermissions([])
    setSelectedPermissions([])
    setPermissionsLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/assistants/${assistant.id}/permissions`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        navigate('/admin')
        return
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to load assistant permissions.'
        )
      }

      const loaded = data.permissions || []

      setPermissions(loaded)

      setSelectedPermissions(
        loaded
          .filter((permission) => Boolean(permission.granted))
          .map((permission) => permission.permission_key)
      )

      if (data.assistant) {
        setManageAssistant(data.assistant)
      }
    } catch (err) {
      setError(err.message)
      setManageAssistant(null)
    } finally {
      setPermissionsLoading(false)
    }
  }

  function closeManage() {
    setManageAssistant(null)
    setPermissions([])
    setSelectedPermissions([])
  }

  function togglePermission(key) {
    setSelectedPermissions((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    )
  }

  async function savePermissions() {
    if (!manageAssistant) return

    setPermissionsSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/assistants/${manageAssistant.id}/permissions`,
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

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to save permissions.'
        )
      }

      setMessage(
        `Permissions for ${manageAssistant.name} were saved successfully.`
      )

      closeManage()
    } catch (err) {
      setError(err.message)
    } finally {
      setPermissionsSaving(false)
    }
  }

  async function handleStatus(assistant) {
    const newStatus = !Boolean(assistant.is_active)

    const confirmed = window.confirm(
      `${newStatus ? 'Enable' : 'Disable'} ${assistant.name}?`
    )

    if (!confirmed) return

    setStatusId(assistant.id)
    setMessage('')
    setError('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/assistants/${assistant.id}/status`,
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

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to update assistant.'
        )
      }

      setMessage(
        `${assistant.name} was ${
          newStatus ? 'enabled' : 'disabled'
        } successfully.`
      )

      setManageAssistant((current) =>
        current?.id === assistant.id
          ? { ...current, is_active: newStatus }
          : current
      )

      await loadAssistants()
    } catch (err) {
      setError(err.message)
    } finally {
      setStatusId(null)
    }
  }

  async function handleDelete(assistant) {
    const confirmed = window.confirm(
      `Delete ${assistant.name}?\n\n` +
        'This action permanently deletes the assistant account.'
    )

    if (!confirmed) return

    setDeletingId(assistant.id)
    setMessage('')
    setError('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/assistants/${assistant.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to delete assistant.'
        )
      }

      if (manageAssistant?.id === assistant.id) {
        closeManage()
      }

      setMessage(
        `${assistant.name} was deleted successfully.`
      )

      await loadAssistants()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
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

  function permissionTitle(key) {
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

    return titles[key] || key
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
          <Link to="/admin/dashboard">Overview</Link>

          <button type="button">
            Products
          </button>

          <Link to="/admin/employees">
            Employees
          </Link>

          <Link
            to="/admin/assistants"
            className="active"
          >
            Assistants
          </Link>

          <button type="button">
            Security
          </button>

          <button type="button">
            Settings
          </button>
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

            <h1>Assistants</h1>

            <p>
              Manage MC2 Labs assistant accounts
              and permissions.
            </p>
          </div>

          <button
            className="addEmployeeButton"
            onClick={() => {
              setShowForm(!showForm)
              setMessage('')
              setError('')
            }}
          >
            {showForm ? 'Cancel' : '+ Add Assistant'}
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
              <h2>Create assistant</h2>

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
                  placeholder="Assistant name"
                  minLength="2"
                  maxLength="100"
                  required
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
                  placeholder="assistant@example.com"
                  required
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
                  minLength="12"
                  maxLength="128"
                  required
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
                  : 'Create Assistant'}
              </button>
            </form>
          </section>
        )}

        {manageAssistant && (
          <section className="employeeManageCard">
            <div className="employeeManageTop">
              <div>
                <span className="dashboardEyebrow">
                  ACCESS CONTROL
                </span>

                <h2>
                  Manage {manageAssistant.name}
                </h2>

                <p>{manageAssistant.email}</p>
              </div>

              <button
                className="employeeManageClose"
                onClick={closeManage}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="employeeManageStatus">
              <div>
                <strong>Account status</strong>

                <span>
                  {Boolean(manageAssistant.is_active)
                    ? 'Assistant account is active.'
                    : 'Assistant account is disabled.'}
                </span>
              </div>

              <button
                type="button"
                className={
                  Boolean(manageAssistant.is_active)
                    ? 'employeeDisableButton'
                    : 'employeeEnableButton'
                }
                disabled={
                  statusId === manageAssistant.id
                }
                onClick={() =>
                  handleStatus(manageAssistant)
                }
              >
                {statusId === manageAssistant.id
                  ? 'Updating...'
                  : Boolean(manageAssistant.is_active)
                    ? 'Disable Assistant'
                    : 'Enable Assistant'}
              </button>
            </div>

            <div className="permissionsSection">
              <div className="permissionsHeading">
                <div>
                  <strong>Permissions</strong>

                  <p>
                    Choose what this assistant can
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
              <h2>Assistant accounts</h2>
            </div>

            <div className="employeesCount">
              {assistants.length}
            </div>
          </div>

          {loading ? (
            <div className="employeesEmpty">
              Loading assistants...
            </div>
          ) : assistants.length === 0 ? (
            <div className="employeesEmpty">
              <strong>No assistants yet</strong>

              <p>
                Create your first assistant account.
              </p>
            </div>
          ) : (
            <div className="employeesTableWrapper">
              <table className="employeesTable">
                <thead>
                  <tr>
                    <th>Assistant</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {assistants.map((assistant) => (
                    <tr key={assistant.id}>
                      <td>
                        <div className="employeeIdentity">
                          <div className="employeeAvatar">
                            {assistant.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {assistant.name}
                            </strong>

                            <span>
                              ASSISTANT #{assistant.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>{assistant.email}</td>

                      <td>
                        <span
                          className={
                            assistant.is_active
                              ? 'employeeStatus active'
                              : 'employeeStatus disabled'
                          }
                        >
                          {assistant.is_active
                            ? 'Active'
                            : 'Disabled'}
                        </span>
                      </td>

                      <td>
                        {assistant.last_login_at
                          ? new Date(
                              assistant.last_login_at
                            ).toLocaleString()
                          : 'Never'}
                      </td>

                      <td>
                        <div className="employeeActions">
                          <button
                            type="button"
                            className="employeeManageButton"
                            onClick={() =>
                              openManage(assistant)
                            }
                          >
                            Manage
                          </button>

                          <button
                            type="button"
                            className="employeeDeleteButton"
                            onClick={() =>
                              handleDelete(assistant)
                            }
                            disabled={
                              deletingId === assistant.id
                            }
                          >
                            {deletingId === assistant.id
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

export default AssistantsPage