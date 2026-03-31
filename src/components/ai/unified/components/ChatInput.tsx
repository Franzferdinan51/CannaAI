import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Image, SendHorizontal } from 'lucide-react';
import { useState } from 'react';

interface ChatInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSendMessage: () => void;
  modeInfo: { name: string };
  disabled?: boolean;
}

export const ChatInput = ({
  inputRef,
  fileInputRef,
  onKeyPress,
  onSendMessage,
  modeInfo,
  disabled
}: ChatInputProps) => {
  const [cameraActive, setCameraActive] = useState(false);

  return (
    <>
      {/* Camera preview */}
      {cameraActive && (
        <div className="border-t border-slate-600 p-3 bg-slate-800">
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <Camera className="h-8 w-8 mx-auto mb-2 text-blue-400" />
            <p className="text-sm text-slate-300 mb-3">Camera Preview</p>
            <div className="flex space-x-2 justify-center">
              <Button
                size="sm"
                onClick={onSendMessage}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                <Camera className="h-4 w-4 mr-1" />
                Capture
              </Button>
              <Button
                size="sm"
                onClick={() => setCameraActive(false)}
                variant="outline"
                className="bg-slate-600 text-slate-200 hover:bg-slate-500"
              >
                <Camera className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-slate-600 p-3">
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            className={`bg-slate-700 text-slate-200 hover:bg-slate-600 ${cameraActive ? 'bg-red-600' : ''}`}
            onClick={() => setCameraActive(!cameraActive)}
            aria-label="Toggle camera"
          >
            {cameraActive ? <Camera className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-slate-700 text-slate-200 hover:bg-slate-600"
            onClick={() => fileInputRef.current?.click()}
            title="Upload plant photo"
            aria-label="Upload plant photo"
          >
            <Image className="h-4 w-4" />
          </Button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
          />
          <Input
            ref={inputRef}
            onKeyPress={onKeyPress}
            placeholder={`Ask about cultivation (${modeInfo.name} mode)...`}
            className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            disabled={disabled}
          />
          <Button
            onClick={onSendMessage}
            disabled={disabled}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white"
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
};
