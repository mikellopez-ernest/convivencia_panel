function buildInitialPayload_(endpoint) {
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

  const cleanEndpoint = String(endpoint || DEFAULT_ENDPOINT).trim() || DEFAULT_ENDPOINT;

  if (cleanEndpoint === ENDPOINT_EXPULSIONS_FORM) {
    return buildExpulsionFormPayload_(activeUser);
  }

  return buildTeacherPortalPayload_(activeUser);
}

function buildTeacherPortalPayload_(activeUser) {
  return {
    ok: true,
    status: 'ok',
    endpoint: DEFAULT_ENDPOINT,
    message: STRINGS.ready,
    activeUser: activeUser,
    actions: [
      {
        endpoint: ENDPOINT_EXPULSIONS_FORM,
        label: 'Formulari d’expulsió'
      }
    ]
  };
}

function assertSchoolUser_() {
  const activeUser = getActiveUserEmail_();

  if (!isSchoolEmail_(activeUser)) {
    throw new Error(activeUser ? STRINGS.accessDenied : STRINGS.missingDomain);
  }

  return activeUser;
}
