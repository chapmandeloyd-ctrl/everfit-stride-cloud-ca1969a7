import React from "react";

export function CardGrid(props: any) { return <div className="grid gap-4">{props.children}</div>; }

export type CardItem = {
  id: string;
  title: string;
  layout?: string;
  [key: string]: any;
};

export function CardItemComponent(props: any) { return <div className="p-4 border rounded">{props.children}</div>; }
export function ClientCardsByLayout(props: any) { return <div>{props.children}</div>; }
