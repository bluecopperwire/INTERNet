import { MOCK_REQUIREMENTS } from '../mocks/requirements.mock'
import type { InternshipRequirement, RequirementUploadInput } from '../types/requirement.types'

export interface RequirementsService {
  getRequirements(): Promise<InternshipRequirement[]>
  uploadRequirement(input: RequirementUploadInput): Promise<InternshipRequirement>
}

let requirements = structuredClone(MOCK_REQUIREMENTS)

const cloneRequirements = () => structuredClone(requirements)

export const requirementsService: RequirementsService = {
  async getRequirements() {
    return Promise.resolve(cloneRequirements())
  },

  async uploadRequirement({ requirementId, file }) {
    const requirementIndex = requirements.findIndex((item) => item.id === requirementId)
    if (requirementIndex < 0) throw new Error('Requirement not found.')

    const updatedRequirement: InternshipRequirement = {
      ...requirements[requirementIndex],
      status: 'submitted',
      document: {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        previewUrl: URL.createObjectURL(file),
      },
    }

    requirements = requirements.map((item, index) => index === requirementIndex ? updatedRequirement : item)
    return Promise.resolve(structuredClone(updatedRequirement))
  },
}
