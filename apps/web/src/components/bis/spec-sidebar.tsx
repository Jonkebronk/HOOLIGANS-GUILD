'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CLASS_SPECS, type WowClass, type Spec } from '@/lib/specs';
import { getSpecIconUrl } from '@/lib/wowhead';
import { cn } from '@/lib/utils';

type SpecSidebarProps = {
  selectedSpec: string | null;
  onSelectSpec: (specId: string) => void;
  classFilter?: WowClass | 'all';
};

export function SpecSidebar({ selectedSpec, onSelectSpec, classFilter = 'all' }: SpecSidebarProps) {
  const [expandedClasses, setExpandedClasses] = useState<Set<WowClass>>(new Set(CLASS_SPECS.map(c => c.name)));

  const toggleClass = (className: WowClass) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(className)) {
        next.delete(className);
      } else {
        next.add(className);
      }
      return next;
    });
  };

  const filteredClasses = classFilter === 'all'
    ? CLASS_SPECS
    : CLASS_SPECS.filter(c => c.name === classFilter);

  return (
    <div className="space-y-1">
      {filteredClasses.map((classDef) => (
        <div key={classDef.name}>
          {/* Class header */}
          <button
            onClick={() => toggleClass(classDef.name)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
          >
            {expandedClasses.has(classDef.name) ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <img
              src={`https://wow.zamimg.com/images/wow/icons/small/classicon_${classDef.name.toLowerCase()}.jpg`}
              alt={classDef.name}
              className="w-5 h-5 rounded"
            />
            <span
              className="font-medium text-sm"
              style={{ color: classDef.color }}
            >
              {classDef.name}
            </span>
          </button>

          {/* Specs list */}
          {expandedClasses.has(classDef.name) && (
            <div className="ml-6 space-y-0.5">
              {classDef.specs.map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => onSelectSpec(spec.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors',
                    selectedSpec === spec.id
                      ? 'bg-primary/20 text-primary'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <img
                    src={getSpecIconUrl(spec.id, spec.class)}
                    alt={spec.name}
                    className="w-5 h-5 rounded"
                  />
                  <span>{spec.name}</span>
                  <span className="ml-auto text-xs opacity-60">{spec.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
