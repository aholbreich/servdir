import serviceIcon from '../../icons/kind/service.svg?raw';
import toolIcon from '../../icons/kind/tool.svg?raw';
import applicationIcon from '../../icons/kind/application.svg?raw';
import libraryIcon from '../../icons/kind/library.svg?raw';
import componentIcon from '../../icons/kind/component.svg?raw';
import iacIcon from '../../icons/kind/iac.svg?raw';
import defaultKindIcon from '../../icons/kind/default.svg?raw';
import configurationIcon from '../../icons/status/configuration.svg?raw';
import issuesIcon from '../../icons/status/issues.svg?raw';
import runtimeIcon from '../../icons/status/runtime.svg?raw';
import repositoryIcon from '../../icons/card-link/repository.svg?raw';
import runbookIcon from '../../icons/card-link/runbook.svg?raw';
import openapiIcon from '../../icons/card-link/openapi.svg?raw';
import deliveryIcon from '../../icons/card-link/delivery.svg?raw';
import platformGroupIcon from '../../icons/platform-group.svg?raw';

const icons = {
  'kind/service': serviceIcon,
  'kind/tool': toolIcon,
  'kind/application': applicationIcon,
  'kind/library': libraryIcon,
  'kind/component': componentIcon,
  'kind/iac': iacIcon,
  'kind/default': defaultKindIcon,
  'status/configuration': configurationIcon,
  'status/issues': issuesIcon,
  'status/runtime': runtimeIcon,
  'card-link/repository': repositoryIcon,
  'card-link/runbook': runbookIcon,
  'card-link/openapi': openapiIcon,
  'card-link/delivery': deliveryIcon,
  'platform-group': platformGroupIcon,
} as const;

type IconName = keyof typeof icons;

interface Props {
  name: IconName;
  size?: number | string;
  className?: string;
  label?: string;
}

export function SvgIcon({ name, size = 16, className, label }: Props) {
  const svg = icons[name];
  if (!svg) return null;
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
