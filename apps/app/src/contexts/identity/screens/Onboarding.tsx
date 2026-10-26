import { useState } from '@lynx-js/react';
import { PrimaryButton } from '../../../ui/PrimaryButton';
import { TextField } from '../../../ui/TextField';

export function Onboarding(props: {
  onCreate: (name: string, slug: string) => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  return (
    <view className="p-4">
      <text className="text-lg">Create your company</text>
      <TextField value={name} placeholder="Company name" onChange={setName} />
      <TextField value={slug} placeholder="Slug" onChange={setSlug} />
      <PrimaryButton
        onPress={() => {
          'background only';
          props.onCreate(name, slug);
        }}
      >
        Create company
      </PrimaryButton>
    </view>
  );
}
