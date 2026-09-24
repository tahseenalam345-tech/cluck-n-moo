"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface MenuSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount?: number;
  totalCount?: number;
}

// Direct appetizing dishes & pizza flavours as requested (no '(etc)' or vague text)
const DISH_SUGGESTIONS = [
  "'Chicken Tikka Pizza'",
  "'Smash Beef Burger'",
  "'Chicken Fajita Pizza'",
  "'Crispy Cluck Zinger'",
  "'Cheesy Loaded Fries'",
  "'Four-Cheese Pizza'",
  "'Golden Fried Chicken'",
  "'Juiciest Family Deal'",
  "'Chilled Cold Drinks'",
];

export function MenuSearchBar({
  searchQuery,
  onSearchChange,
  resultCount,
}: MenuSearchBarProps) {
  const [dishIndex, setDishIndex] = useState(0);
  const [typedDish, setTypedDish] = useState(DISH_SUGGESTIONS[0]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typewriter that keeps "Search for " steady and only types/erases the dish name
  useEffect(() => {
    if (searchQuery.length > 0) return;

    const currentTarget = DISH_SUGGESTIONS[dishIndex];
    const typingSpeed = isDeleting ? 30 : 60;
    const pauseDelay = 2000;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (typedDish.length < currentTarget.length) {
          setTypedDish(currentTarget.slice(0, typedDish.length + 1));
        } else {
          // Pause at complete text before starting to backspace
          setTimeout(() => setIsDeleting(true), pauseDelay);
        }
      } else {
        if (typedDish.length > 0) {
          // Erase back to empty dish (leaving "Search for " intact)
          setTypedDish(currentTarget.slice(0, typedDish.length - 1));
        } else {
          setIsDeleting(false);
          setDishIndex((prev) => (prev + 1) % DISH_SUGGESTIONS.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [typedDish, isDeleting, dishIndex, searchQuery]);

  const activePlaceholder = isFocused && !searchQuery
    ? "Search for dish name, flavour, or category..."
    : `Search for ${typedDish}...`;

  return (
    <div
      className="menu-search-bar-wrapper"
      style={{
        width: "100%",
        padding: "8px 0 2px",
      }}
    >
      {/* Search Input Container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: "680px",
          margin: "0 auto",
        }}
      >
        {/* Left Search Icon */}
        <div
          style={{
            position: "absolute",
            left: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            color: isFocused || searchQuery ? "var(--cnm-orange)" : "var(--cnm-text-muted)",
            transition: "color 0.2s ease",
            zIndex: 2,
          }}
        >
          <Search size={18} />
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={activePlaceholder}
          aria-label="Search menu items"
          style={{
            width: "100%",
            height: "44px",
            padding: "0 40px 0 42px",
            fontSize: "13.5px",
            fontFamily: "var(--font-body)",
            fontWeight: 500,
            color: "var(--cnm-text-primary)",
            backgroundColor: "var(--cnm-surface)",
            border: `1.5px solid ${isFocused ? "var(--cnm-orange)" : "var(--cnm-border)"}`,
            borderRadius: "var(--radius-full)",
            outline: "none",
            boxShadow: isFocused
              ? "0 0 0 3px rgba(255, 130, 67, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08)"
              : "0 2px 6px rgba(0, 0, 0, 0.04)",
            transition: "all 0.2s ease",
          }}
        />

        {/* Clear Button */}
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: "12px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 130, 67, 0.15)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--cnm-orange)",
              cursor: "pointer",
              zIndex: 2,
              transition: "all 0.15s ease",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Active Search Result Feedback */}
      {searchQuery && typeof resultCount === "number" && (
        <div
          style={{
            textAlign: "center",
            marginTop: "8px",
            fontSize: "12px",
            color: "var(--cnm-text-muted)",
          }}
        >
          Showing <strong style={{ color: "var(--cnm-orange)" }}>{resultCount}</strong> dishes matching &quot;
          <strong style={{ color: "var(--cnm-text-primary)" }}>{searchQuery}</strong>&quot;
          <button
            type="button"
            onClick={() => onSearchChange("")}
            style={{
              marginLeft: "8px",
              color: "var(--cnm-orange)",
              background: "none",
              border: "none",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
