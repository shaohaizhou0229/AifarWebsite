function isApprovedProfile(profile) {
  return profile?.accountStatus === "active" || profile?.account_status === "active";
}

function accountAccessError(profile) {
  return (profile?.accountStatus || profile?.account_status) === "pending_approval"
    ? "account_pending_approval" : "account_inactive";
}

module.exports = { isApprovedProfile, accountAccessError };
