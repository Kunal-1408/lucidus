# 03: Country of residence, Home state, Citizenship and Residence status

**What to build:** A Student anywhere can say where they live and who they are. The form asks Country → state/region (ISO codes, regions of that country only) → Home state (abroad only) → Residence status (abroad only) → Citizenship (Indian citizen, OCI card holder, another nationality with its country), and shows category only to Indian citizens and OCI holders. Extraction records these as Criteria and the Matcher judges them. Added beside the old domicile and school-state fields, which keep working until ticket 09.

See spec: "Profile", "Which questions appear" (other conditional questions), "Criteria and matching", glossary terms Country of residence, Home state, Citizenship, Residence status.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Profile (both copies) gains country of residence, region, Home state, Residence status, Citizenship `indian` | `oci` | `other` and Citizenship country; every field optional
- [ ] Rules module: region needs a country and must belong to it; Home state and Residence status only when country isn't India (in India, Home state is the region); Citizenship country only for `other`; category only for `indian` or `oci`; changing country clears region, Home state and Residence status; Citizenship moving to `other` clears category, leaving `other` clears Citizenship country
- [ ] Backend validation rejects the same contradictions and invalid ISO codes with 400
- [ ] Saved Profiles migrate on load: `domicileState` becomes country IN, the matching ISO region and the same Home state; Citizenship `other` keeps no country
- [ ] Extraction rules and the LLM field guide produce country-of-residence, region, Home state, Residence status, Citizenship and Citizenship country Criteria; domicile sentences produce Home state
- [ ] e2e: a fixture page restricted to residents of a country, one for permanent residents, one for OCI holders and one for a Home state each match pass, fail and unknown as expected
- [ ] Contract test and Indian regression scenarios still pass
- [ ] Glossary terms used in UI labels and code
