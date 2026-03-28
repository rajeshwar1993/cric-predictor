## Agent Team

This project uses a multi-agent development workflow. When building features, use the `build-feature` skill which orchestrates the following agents:

- **TPM**: Orchestrator — coordinates all other agents
- **PM**: Product decisions and requirements
- **PSE**: Architecture, coding, and code review
- **UI/UX Designer**: Interface design and component specs
- **QA Engineer**: Test planning and quality assurance
- **Documentation Writer**: Technical documentation
- **Copywriter**: In-app and marketing copy

### Key Rules
1. All feature work happens on `feature/[short-description]` branches.
2. All feature documentation goes into `docs/feature_docs/[short-description]/`.
3. Users must approve at Gate 1 (requirements + architecture) and Gate 2 (final delivery).
4. PSE agents have strict domain separation: PSE-Frontend and PSE-Supabase never overlap.
5. Documentation is continuous, not an afterthought.
