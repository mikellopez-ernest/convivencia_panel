function buildTeacherPortalPayload_() {
  const activeUser = getActiveUserEmail_();

  if (!isSchoolEmail_(activeUser)) {
    return {
      ok: true,
      status: 'unauthorized',
      message: activeUser ? STRINGS.accessDenied : STRINGS.missingDomain,
      activeUser: activeUser,
      actions: []
    };
  }

  return {
    ok: true,
    status: 'ok',
    message: STRINGS.ready,
    activeUser: activeUser,
    actions: []
  };
}
