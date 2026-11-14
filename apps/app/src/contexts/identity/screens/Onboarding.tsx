import { useState } from '@lynx-js/react';
import { Button } from '../../../ui/Button';
import { PrimaryButton } from '../../../ui/PrimaryButton';
import { TextField } from '../../../ui/TextField';
import type { CreateCompanyResult } from '../api/company';
import { slugFromName } from './org';

function createError(result: CreateCompanyResult): string | null {
  switch (result) {
    case 'created':
      return null;
    case 'taken':
      return 'That workspace URL is taken.';
    case 'failed':
      return 'Could not create the company.';
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

export function Onboarding(props: {
  onCreate: (name: string, slug: string) => Promise<CreateCompanyResult>;
  onSignOut: () => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const slug = slugFromName(name);
  return (
    <view className="flex flex-col p-6 min-h-screen bg-gray-100 text-gray-900">
      <text className="text-sm text-gray-500">Step 1 of 2</text>
      <text className="text-2xl font-semibold mt-6">Create your company</text>
      <text className="text-base text-gray-600 mt-2">
        You'll be the owner. Next you can invite your team.
      </text>
      <text className="text-sm text-gray-500 mt-8 mb-2">Company name</text>
      <TextField
        value={name}
        placeholder="Company name"
        onChange={(value) => {
          setName(value);
          setError(null);
        }}
      />
      <text className="text-sm text-gray-500 mt-4 mb-2">Workspace URL</text>
      <text className="text-base">reviews.app/{slug}</text>
      {error ? <text className="text-base mt-3">{error}</text> : null}
      <view className="mt-8">
        <PrimaryButton
          onPress={() => {
            'background only';
            if (slug.length === 0) {
              return;
            }
            void props.onCreate(name.trim(), slug).then((result) => {
              setError(createError(result));
            });
          }}
        >
          Create company
        </PrimaryButton>
      </view>
      <view className="mt-4 items-center">
        <Button onClick={props.onSignOut}>
          <text className="text-sm text-gray-500">Sign out</text>
        </Button>
      </view>
    </view>
  );
}
