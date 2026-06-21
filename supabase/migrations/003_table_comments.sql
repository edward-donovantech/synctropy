-- Document table purposes for future contributors
COMMENT ON TABLE public.pipeline_artifacts IS 'Stores full JSON output from each Synctropy pipeline skill run. Premium users only. Written by MCP server via service_role.';
COMMENT ON TABLE public.entropy_scans IS 'Stores folder entropy scores from analyze_structure tool calls. Written by MCP server via service_role.';
COMMENT ON TABLE public.user_preferences IS 'Per-user config: scan root, ignore paths, archive threshold, taxonomy domains, premium status, and storage mode.';
