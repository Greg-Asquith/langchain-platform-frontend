// src/lib/teams.ts

export const TEAM_COLORS = [
  { name: "Red", value: "#dc2626", gradient: "from-red-500 to-red-600" },
  { name: "Orange", value: "#ea580c", gradient: "from-orange-500 to-orange-600" },
  { name: "Amber", value: "#d97706", gradient: "from-amber-500 to-amber-600" },
  { name: "Yellow", value: "#eab308", gradient: "from-yellow-500 to-yellow-600" },
  { name: "Lime", value: "#84cc16", gradient: "from-lime-500 to-lime-600" },
  { name: "Green", value: "#059669", gradient: "from-green-500 to-green-600" },
  { name: "Teal", value: "#0d9488", gradient: "from-teal-500 to-teal-600" },
  { name: "Cyan", value: "#0891b2", gradient: "from-cyan-500 to-cyan-600" },
  { name: "Blue", value: "#2563eb", gradient: "from-blue-500 to-blue-600" },
  { name: "Indigo", value: "#4f46e5", gradient: "from-indigo-500 to-indigo-600" },
  { name: "Purple", value: "#7c3aed", gradient: "from-purple-500 to-purple-600" },
  { name: "Pink", value: "#db2777", gradient: "from-pink-500 to-pink-600" },
  { name: "Rose", value: "#e11d48", gradient: "from-rose-500 to-rose-600" },
  { name: "Slate", value: "#475569", gradient: "from-slate-500 to-slate-600" },
  { name: "Zinc", value: "#e1e1e1", gradient: "from-zinc-500 to-zinc-600" },
  { name: "Stone", value: "#808000", gradient: "from-stone-500 to-stone-600" }
]

export function validateTeamId(teamId: string | null | undefined) {
  if (!teamId) {
    return false;
  }
  return /^org_.+/.test(teamId)
}

export function validateDomainId(domainId: string | null | undefined) {
  if (!domainId) {
    return false;
  }
  return /^org_domain_.+/.test(domainId)
}

export function validateInvitationId(invitationId: string | null | undefined) {
  if (!invitationId) {
    return false;
  }
  return /^invitation_.+/.test(invitationId)
}

export function validateMembershipId(membershipId: string | null | undefined) {
  if (!membershipId) {
    return false;
  }
  return /^om_/.test(membershipId)
}
