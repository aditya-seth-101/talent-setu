import React from "react";
import { Button } from "./Button";

export default {
  title: "Button",
  component: Button,
};

export const Primary = () => <Button variant="primary">Primary Button</Button>;
export const Secondary = () => (
  <Button variant="secondary">Secondary Button</Button>
);
export const Ghost = () => <Button variant="ghost">Ghost Button</Button>;
