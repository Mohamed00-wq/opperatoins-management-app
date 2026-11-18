from enum import Enum


class Role(str, Enum):
    ADMINISTRATOR = "administrator"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class Permission(str, Enum):
    MANAGE_USERS = "manage_users"
    VIEW_LOGS = "view_logs"
    VIEW_DASHBOARD = "view_dashboard"
    MANAGE_TASKS = "manage_tasks"
    DELETE_TASKS = "delete_tasks"
    VIEW_HEALTH = "view_health"


ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.ADMINISTRATOR: frozenset(Permission),
    Role.MANAGER: frozenset(
        {
            Permission.VIEW_LOGS,
            Permission.VIEW_DASHBOARD,
            Permission.MANAGE_TASKS,
            Permission.DELETE_TASKS,
            Permission.VIEW_HEALTH,
        }
    ),
    Role.EMPLOYEE: frozenset(
        {
            Permission.VIEW_DASHBOARD,
            Permission.MANAGE_TASKS,
            Permission.VIEW_HEALTH,
        }
    ),
}


def has_permission(role: Role | str, permission: Permission | str) -> bool:
    try:
        role_enum = Role(role)
        permission_enum = Permission(permission)
    except ValueError:
        return False
    return permission_enum in ROLE_PERMISSIONS.get(role_enum, frozenset())


def has_any_permission(role: Role | str, permissions: list[Permission | str]) -> bool:
    return any(has_permission(role, permission) for permission in permissions)


def has_all_permissions(role: Role | str, permissions: list[Permission | str]) -> bool:
    return all(has_permission(role, permission) for permission in permissions)
