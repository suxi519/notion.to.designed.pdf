import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { UrlInputSchema, type UrlInput } from '@/lib/schemas/notion';

type UrlInputFormProps = {
  isLoading: boolean;
  onSubmit: (url: string) => void;
};

export function UrlInputForm({ isLoading, onSubmit }: UrlInputFormProps) {
  const form = useForm<UrlInput>({
    resolver: zodResolver(UrlInputSchema),
    defaultValues: { url: '' },
    mode: 'onSubmit',
  });

  function handleSubmit(data: UrlInput) {
    onSubmit(data.url);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="no-print w-full"
        noValidate
      >
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-col gap-3 sm:flex-row">
                <FormControl>
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://notion.so/..."
                    aria-label="Notion 페이지 URL"
                    disabled={isLoading}
                    className="flex-1 h-12 text-base"
                  />
                </FormControl>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 px-8 shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      변환 중...
                    </>
                  ) : (
                    '변환'
                  )}
                </Button>
              </div>
              <FormMessage role="alert" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
